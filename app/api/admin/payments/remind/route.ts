// app/api/admin/payments/remind/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

// TR numara normalize: sadece rakam, son 10 hane (5XXXXXXXXX)
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  let d = digits.slice(-10);
  // Güvence: +90/0 varyantlarını da yakala
  if (!(d.length === 10 && d.startsWith("5"))) {
    if (digits.startsWith("90") && digits.length === 12) d = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) d = digits.slice(1);
  }
  return d.length === 10 && d.startsWith("5") ? d : null;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const rid = Math.random().toString(36).slice(2, 10); // basit request id

  // --- yetki ---
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    console.warn(`[${rid}] AUTH_FAIL`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- input ---
  const { paymentId, customMessage } = await req.json().catch(() => ({}));
  if (!paymentId) {
    console.warn(`[${rid}] BAD_REQ: paymentId yok`);
    return NextResponse.json({ error: "paymentId gerekli" }, { status: 400 });
  }

  // --- Render proxy ENV ---
  const RENDER_SMS_URL = process.env.RENDER_SMS_URL!;
  const RENDER_SMS_TOKEN = process.env.RENDER_SMS_TOKEN!;
  if (!RENDER_SMS_URL || !RENDER_SMS_TOKEN) {
    console.error(`[${rid}] ENV_MISSING: RENDER_SMS_URL/TOKEN`);
    return NextResponse.json(
      { error: "RENDER_SMS_URL / RENDER_SMS_TOKEN eksik" },
      { status: 500 }
    );
  }

  console.info(`[${rid}] START payId=${paymentId}`);

  // payments.student_package_id -> student_packages.id -> students.student_id
  const { data: rows, error } = await supabaseAdmin
    .from("payments")
    .select(`
      id,
      amount,
      paid_at,
      period_start,
      period_end,
      status,
      student_packages:student_package_id (
        id,
        students:student_id (
          student_name,
          parent_phone_e164
        )
      )
    `)
    .eq("id", paymentId)
    .limit(1);

  if (error) {
    console.error(`[${rid}] DB_ERR: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const p: any = rows?.[0];
  if (!p) {
    console.warn(`[${rid}] NOT_FOUND: payment`);
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  // students tekil/dizi olabilir
  const studentRel = p?.student_packages?.students;
  const student = Array.isArray(studentRel) ? studentRel[0] : studentRel;
  const phone = normalizeTR(student?.parent_phone_e164 || "");
  if (!phone) {
    console.warn(`[${rid}] NO_PHONE or invalid`);
    return NextResponse.json({ error: "Geçerli telefon yok" }, { status: 400 });
  }

  const msg =
    (customMessage?.trim() as string) ||
    `Merhaba, ${student?.student_name ?? "öğrenci"} için yaklaşan ödeme hatırlatmasıdır. Sorunuz varsa bize yazabilirsiniz.`;

  // --- Render SMS Proxy'ye istek ---
  let proxyJson: any = null;
  let proxyText = "";

  try {
    const payload = {
      message: msg,
      recipients: [phone],
      // msgheader istersen buradan geçebilirsin: msgheader: process.env.NETGSM_MSGHEADER
    };

    console.info(
      `[${rid}] PROXY_REQ -> ${RENDER_SMS_URL} | recipients=1 | phone=${phone} | msgLen=${msg.length}`
    );

    const t1 = Date.now();
    const res = await fetch(RENDER_SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RENDER_SMS_TOKEN}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const dt = Date.now() - t1;

    // json parse dene; değilse text al
    proxyJson = await res.json().catch(async () => {
      proxyText = await res.text().catch(() => "");
      return null;
    });

    const ok = res.ok && (proxyJson?.ok ?? false);
    const bulkid = proxyJson?.bulkid ?? null;

    console.info(
      `[${rid}] PROXY_RES status=${res.status} ok=${ok} bulkid=${bulkid ?? "-"} time=${dt}ms`
    );
    if (!ok) {
      console.warn(`[${rid}] PROXY_FAIL body=${proxyText || JSON.stringify(proxyJson)}`);
    }

    // --- opsiyonel log kaydı (sms_logs) ---
    try {
      await supabaseAdmin.from("sms_logs").insert({
        payment_id: paymentId,
        provider: "render-netgsm",
        bulkid: bulkid,
        request_numbers_csv: phone,
        message_body: msg,
        response_raw: proxyJson ? JSON.stringify(proxyJson) : proxyText,
      });
      console.info(`[${rid}] DB_LOG ok`);
    } catch (e: any) {
      console.warn(`[${rid}] DB_LOG skip: ${e?.message || e}`);
    }

    if (!ok) {
      return NextResponse.json(
        { error: "SMS gönderim hatası (proxy)", details: proxyJson ?? proxyText },
        { status: 502 }
      );
    }

    console.info(`[${rid}] DONE total=${Date.now() - t0}ms`);
    return NextResponse.json({ ok: true, bulkid, queued: 1 });
  } catch (e: any) {
    console.error(`[${rid}] PROXY_ERR: ${e?.message || e}`);
    return NextResponse.json(
      { error: "Render proxy bağlantı hatası", details: e?.message || String(e) },
      { status: 502 }
    );
  }
}
