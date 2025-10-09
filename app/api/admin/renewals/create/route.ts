// app/api/admin/renewals/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  // auth (isteğin üzerine .get için await kullanıldı)
  const c = await cookies();
  const isAdmin = (c.get("admin_session")?.value || "") === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { student_id, package_id, method, status, note } = body || {};
  if (!student_id || !package_id) {
    return NextResponse.json({ error: "student_id ve package_id zorunlu" }, { status: 400 });
  }

  // DB fonksiyonunu çağır
  const { data, error } = await supabaseAdmin.rpc("admin_renew_student_package", {
    p_student: student_id,
    p_package: package_id,
    p_method: method || "transfer",
    p_status: status || "paid",
    p_note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result: data ?? null }, { status: 200 });
}