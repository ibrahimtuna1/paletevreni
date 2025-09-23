// app/api/admin/trials/approve/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

// (isteğe bağlı) Node tarafında çalıştığımızı garanti etmek istersen:
// export const runtime = "nodejs";

type Body = {
  applicationId?: string;
  scheduledAt?: string; // ISO string bekliyoruz
};

export async function POST(req: Request) {
  try {
    // ---- basit auth (örnek) ----
    const cookieStore = await cookies();
    const role = cookieStore.get("admin_session")?.value;
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- body ----
    const body = (await req.json()) as Body;
    const applicationId = body?.applicationId?.trim();
    const scheduledAt = body?.scheduledAt?.trim();

    if (!applicationId || !scheduledAt) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    // Tarih doğrula
    const dt = new Date(scheduledAt);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih formatı" }, { status: 400 });
    }

    // ISO'ya normalize et (UTC) — Postgres timestamptz ile uyumlu
    const iso = dt.toISOString();

    // ---- RPC çağrısı ----
    const { data, error } = await supabaseAdmin.rpc("approve_application_to_trial", {
      p_basvuru_id: applicationId,
      p_scheduled_at: iso,
      p_admin: "panel", // istersen gerçek admin mail/ID yaz
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, trialId: data });
  } catch (err: any) {
    console.error("approve route error:", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu" }, { status: 500 });
  }
}
