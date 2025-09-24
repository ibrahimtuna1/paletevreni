// app/api/admin/classes/message/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

/** 5XXXXXXXXX (10 hane) normalize */
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
  const { classId, body } = await req.json().catch(() => ({} as any));
  if (!classId || !body?.trim()) {
    return NextResponse.json({ error: "classId ve body zorunlu" }, { status: 400 });
  }

  // env
  const RENDER_SMS_URL = process.env.RENDER_SMS_URL!;
  const MSGHEADER = (process.env.NETGSM_MSGHEADER || "").trim(); // 850'li başlık
  if (!RENDER_SMS_URL) return NextResponse.json({ error: "RENDER_SMS_URL eksik" }, { status: 500 });
  if (!MSGHEADER) return NextResponse.json({ error: "NETGSM_MSGHEADER eksik (ör. 8503028492)" }, { status: 500 });

  // alıcılar
  const { data: studs, error } = await supabaseAdmin
    .from("students")
    .select("parent_phone_e164")
    .eq("class_id", classId)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const recipients = Array.from(
    new Set(
      (studs ?? [])
        .map((s: any) => normalizeTR(s.parent_phone_e164))
        .filter((x): x is string => !!x)
    )
  );
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Geçerli alıcı yok" }, { status: 400 });
  }

  // Render'a POST (auth kapalı → Authorization header YOK)
  let proxyJson: any = null;
  let proxyText = "";
  try {
    const res = await fetch(RENDER_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.trim(),
        recipients,
        msgheader: MSGHEADER, // aynı PS testindeki gibi body’de yolluyoruz
      }),
      cache: "no-store",
    });

    proxyJson = await res.json().catch(async () => {
      proxyText = await res.text().catch(() => "");
      return null;
    });

    const ok = res.ok && !!proxyJson?.ok;
    const bulkid = proxyJson?.bulkid ?? null;

    // log (opsiyonel)
    try {
      await supabaseAdmin.from("sms_logs").insert({
        class_id: classId,
        provider: "render-netgsm",
        bulkid,
        request_count: recipients.length,
        request_numbers_csv: recipients.join(","),
        message_body: body.trim(),
        response_raw: proxyJson ? JSON.stringify(proxyJson) : proxyText,
      });
    } catch { /* tablo yoksa geç */ }

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
