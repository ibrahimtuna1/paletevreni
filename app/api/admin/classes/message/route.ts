// app/api/admin/classes/message/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

/** Basit normalizasyon: sadece rakam bırak, son 10 haneyi al (5XXXXXXXXX) */
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  let d = digits.slice(-10);
  // Güvence: Son 10 hane 5'le başlamıyorsa +90/0 varyantlarını da yakala
  if (!(d.length === 10 && d.startsWith("5"))) {
    // 90XXXXXXXXXX
    if (digits.startsWith("90") && digits.length === 12) d = digits.slice(2);
    // 0XXXXXXXXXX
    else if (digits.startsWith("0") && digits.length === 11) d = digits.slice(1);
  }
  return d.length === 10 && d.startsWith("5") ? d : null;
}

export async function POST(req: Request) {
  // --- Yetki kontrolü ---
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Girdi ---
  const { classId, body } = (await req.json().catch(() => ({}))) as {
    classId?: string;
    body?: string;
  };
  if (!classId || !body?.trim()) {
    return NextResponse.json({ error: "classId ve body zorunlu" }, { status: 400 });
  }

  // --- Render proxy ENV ---
  const RENDER_SMS_URL = process.env.RENDER_SMS_URL!;
  const RENDER_SMS_TOKEN = process.env.RENDER_SMS_TOKEN!;
  if (!RENDER_SMS_URL || !RENDER_SMS_TOKEN) {
    return NextResponse.json(
      { error: "RENDER_SMS_URL / RENDER_SMS_TOKEN eksik" },
      { status: 500 }
    );
  }

  // --- Sınıfın aktif öğrencileri ---
  const { data: studs, error } = await supabaseAdmin
    .from("students")
    .select("parent_phone_e164")
    .eq("class_id", classId)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // --- Alıcı listesi (normalize) ---
  const rawNumbers = (studs ?? [])
    .map((s: any) => s.parent_phone_e164)
    .filter(Boolean) as string[];

  const normalized = Array.from(
    new Set(
      rawNumbers
        .map(normalizeTR)
        .filter((x): x is string => !!x)
    )
  );

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Geçerli alıcı bulunamadı." }, { status: 400 });
  }

  // --- Render SMS Proxy'ye istek ---
  let proxyJson: any = null;
  let proxyText = "";
  try {
    const res = await fetch(RENDER_SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RENDER_SMS_TOKEN}`,
      },
      body: JSON.stringify({
        message: body.trim(),
        recipients: normalized,
        // İstersen msgheader geçebilirsin: msgheader: process.env.NETGSM_MSGHEADER
      }),
      cache: "no-store",
    });

    proxyJson = await res.json().catch(async () => {
      proxyText = await res.text().catch(() => "");
      return null;
    });

    const ok = res.ok && (proxyJson?.ok ?? true);
    const bulkid = proxyJson?.bulkid ?? null;

    // Basit log objesi:
    const log = {
      provider: "render-netgsm",
      requestCount: normalized.length,
      requestPreviewCommaSeparated: normalized.join(","),
      responseRaw: proxyJson ? JSON.stringify(proxyJson) : proxyText,
      bulkid,
      ok,
      created_at: new Date().toISOString(),
    };

    // (Opsiyonel) Supabase'e logla — tablo yoksa es geçer
    try {
      await supabaseAdmin.from("sms_logs").insert({
        class_id: classId,
        provider: log.provider,
        bulkid: log.bulkid,
        request_count: log.requestCount,
        request_numbers_csv: log.requestPreviewCommaSeparated,
        message_body: body.trim(),
        response_raw: log.responseRaw,
      });
    } catch {}

    if (!ok) {
      return NextResponse.json(
        { error: "SMS gönderim hatası (proxy)", details: proxyJson ?? proxyText, log },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      queued: normalized.length,
      bulkid,
      log,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Render proxy bağlantı hatası", details: e?.message, responseRaw: proxyText || null },
      { status: 502 }
    );
  }
}
