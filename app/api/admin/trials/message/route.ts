// app/api/admin/trials/message/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

// classes/message ile aynı normalize: 10 haneli 5XXXXXXXXX çıktısı
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  d = d.slice(-10);
  return d.length === 10 && d.startsWith("5") ? d : null;
}

export async function POST(req: Request) {
  // auth
  const role = (await cookies()).get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // input
  const { day, trial_ids, message } = await req.json().catch(() => ({} as any));
  if (!Array.isArray(trial_ids) || trial_ids.length === 0 || !message?.trim()) {
    return NextResponse.json({ error: "trial_ids ve message zorunlu" }, { status: 400 });
  }

  // env
  const RENDER_SMS_URL = process.env.RENDER_SMS_URL!;
  if (!RENDER_SMS_URL) return NextResponse.json({ error: "RENDER_SMS_URL eksik" }, { status: 500 });
  const MSGHEADER = (process.env.NETGSM_MSGHEADER || "8503028492").trim();

  // alıcıları çek (TABLO ADI DEĞİŞTİ)
  const { data: trials, error } = await supabaseAdmin
    .from("tanitim_dersi_ogrencileri")
    .select("id, parent_phone_e164")
    .in("id", trial_ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const recipients = Array.from(
    new Set(
      (trials ?? [])
        .map((t: any) => normalizeTR(t.parent_phone_e164))
        .filter((x): x is string => !!x)
    )
  );
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Geçerli alıcı yok" }, { status: 400 });
  }

  // Render proxy'ye gönder
  let proxyJson: any = null;
  let proxyText = "";
  try {
    const res = await fetch(RENDER_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // auth yok; proxy tarafı hallediyor
      body: JSON.stringify({
        message: message.trim(),
        recipients,
        msgheader: MSGHEADER, // 850’li başlık
      }),
      cache: "no-store",
    });

    proxyJson = await res.json().catch(async () => {
      proxyText = await res.text().catch(() => "");
      return null;
    });

    const ok = res.ok && !!proxyJson?.ok;
    const bulkid = proxyJson?.bulkid ?? null;

    // log (sms_logs şemanıza uygunsa kaydeder; değilse sessiz düşer)
    try {
      await supabaseAdmin.from("sms_logs").insert({
        class_id: null, // sınıf yok
        provider: "render-netgsm",
        bulkid,
        request_count: recipients.length,
        request_numbers_csv: recipients.join(","),
        message_body: message.trim(),
        day: day ?? null,              // sütun yoksa insert fail ederse sorun değil
        trials_csv: trial_ids.join(","), // sütun yoksa yine sorun değil (opsiyonel)
        response_raw: proxyJson ? JSON.stringify(proxyJson) : proxyText,
      } as any);
    } catch {}

    if (!ok) {
      return NextResponse.json(
        { error: "SMS gönderim hatası (proxy)", details: proxyJson ?? proxyText },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, queued: recipients.length, bulkid });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Render proxy bağlantı hatası", details: e?.message, raw: proxyText || null },
      { status: 502 }
    );
  }
}
