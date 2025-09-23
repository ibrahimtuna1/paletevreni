// app/api/admin/classes/message/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

/** Basit normalizasyon: sadece rakam bırak, son 10 haneyi al (5XXXXXXXXX) */
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return last10.startsWith("5") && last10.length === 10 ? last10 : null;
}

/** Netgsm XML gövdesini hazırla (1:n) */
function buildNetgsmXml({
  usercode,
  password,
  msgheader,
  message,
  recipients, // 10 haneli string[]
}: {
  usercode: string;
  password: string;
  msgheader: string;
  message: string;
  recipients: string[];
}) {
  const noTags = recipients.map((n) => `<no>${n}</no>`).join("");
  // company dil="TR" -> Türkçe karakter seti için örneklerde öneriliyor
  // Endpoint: https://api.netgsm.com.tr/sms/send/xml  (XML POST 1:n) :contentReference[oaicite:2]{index=2}
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

  // --- Netgsm env ---
  const USERCODE = process.env.NETGSM_USERCODE!;
  const PASSWORD = process.env.NETGSM_PASSWORD!;
  const MSGHEADER = process.env.NETGSM_MSGHEADER!; // Netgsm panelinde onaylı başlık

  if (!USERCODE || !PASSWORD || !MSGHEADER) {
    return NextResponse.json(
      { error: "NETGSM_USERCODE / NETGSM_PASSWORD / NETGSM_MSGHEADER eksik" },
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

  // --- Netgsm XML ---
  const xml = buildNetgsmXml({
    usercode: USERCODE,
    password: PASSWORD,
    msgheader: MSGHEADER,
    message: body.trim(),
    recipients: normalized,
  });

  // --- İstek (XML POST) ---
  let netgsmText = "";
  try {
    const res = await fetch("https://api.netgsm.com.tr/sms/send/xml", {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: xml,
      // Netgsm IP kısıtı varsa 30 hata kodu dönebilir (dokümanlarda örneklenmiş). :contentReference[oaicite:3]{index=3}
    });

    netgsmText = await res.text();

    // Ör: "00 1311033503" -> başarı + bulkid
    const okMatch = netgsmText.match(/^(?:00)\s+(\d+)/);
    const isOk = !!okMatch;

    // Basit log objesi:
    const log = {
      provider: "netgsm",
      requestCount: normalized.length,
      requestPreviewCommaSeparated: normalized.join(","), // İstediğin gibi virgülle de önizleme
      responseRaw: netgsmText,
      bulkid: okMatch ? okMatch[1] : null,
      ok: isOk,
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
    } catch {
      // tablo yoksa sessiz geç
    }

    if (!isOk) {
      return NextResponse.json(
        { error: "Netgsm gönderim hatası", details: netgsmText, log },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      queued: normalized.length,
      bulkid: okMatch![1],
      log,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Netgsm bağlantı hatası", details: e?.message, responseRaw: netgsmText || null },
      { status: 502 }
    );
  }
}
