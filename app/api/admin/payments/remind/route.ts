// app/api/admin/payments/remind/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

// TR numara normalize: sadece rakam, son 10 hane (5XXXXXXXXX)
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return last10.startsWith("5") ? last10 : null;
}

function buildNetgsmXml({
  usercode, password, msgheader, message, recipients,
}: {
  usercode: string; password: string; msgheader: string; message: string; recipients: string[];
}) {
  const noTags = recipients.map((n) => `<no>${n}</no>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company dil="TR">Netgsm</company>
    <usercode>${usercode}</usercode>
    <password>${password}</password>
    <type>1:n</type>
    <msgheader>${msgheader}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${message}]]></msg>
    ${noTags}
  </body>
</mainbody>`;
}

export async function POST(req: Request) {
  // --- yetki ---
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, customMessage } = await req.json();

  const USERCODE = process.env.NETGSM_USERCODE!;
  const PASSWORD = process.env.NETGSM_PASSWORD!;
  const MSGHEADER = process.env.NETGSM_MSGHEADER!;
  if (!USERCODE || !PASSWORD || !MSGHEADER) {
    return NextResponse.json(
      { error: "NETGSM_USERCODE / NETGSM_PASSWORD / NETGSM_MSGHEADER eksik" },
      { status: 500 }
    );
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const p: any = rows?.[0];
  if (!p) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

  // --- DİKKAT: students tekil ya da dizi olabilir. Güvenli çıkarım:
  const studentRel = p?.student_packages?.students;
  const student = Array.isArray(studentRel) ? studentRel[0] : studentRel; // dizi ise ilkini al
  const phone = normalizeTR(student?.parent_phone_e164 || "");
  if (!phone) return NextResponse.json({ error: "Geçerli telefon yok" }, { status: 400 });

  const msg =
    (customMessage?.trim() as string) ||
    `Merhaba, ${student?.student_name ?? "öğrenci"} için yaklaşan ödeme hatırlatmasıdır. Sorunuz varsa bize yazabilirsiniz.`;

  // Netgsm gönder
  let text = "";
  try {
    const res = await fetch("https://api.netgsm.com.tr/sms/send/xml", {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: buildNetgsmXml({
        usercode: USERCODE,
        password: PASSWORD,
        msgheader: MSGHEADER,
        message: msg,
        recipients: [phone],
      }),
    });
    text = await res.text();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Netgsm bağlantı hatası", details: e?.message || String(e) },
      { status: 502 }
    );
  }

  const ok = /^00\s+\d+/.test(text); // "00 <bulkid>"
  if (!ok) return NextResponse.json({ error: "Netgsm hatası", details: text }, { status: 502 });

  // opsiyonel log
  try {
    await supabaseAdmin.from("sms_logs").insert({
      payment_id: paymentId,
      provider: "netgsm",
      request_numbers_csv: phone,
      message_body: msg,
      response_raw: text,
    });
  } catch {
    /* tablo yoksa sessiz geç */
  }

  return NextResponse.json({ ok: true, response: text });
}
