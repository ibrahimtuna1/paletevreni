// app/api/admin/studentpackages/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const c = await cookies();
  if ((c.get("admin_session")?.value || "") !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  // Aktif + en güncel paketleri getiriyoruz (liste için yeterli)
  let query = supabaseAdmin
    .from("student_packages")
    .select(`
      id,
      student_id,
      status,
      start_date,
      sessions_total,
      price_at_purchase,
      students:students ( id, student_name, parent_name, parent_phone_e164 ),
      packages:packages ( id, title )
    `)
    .order("start_date", { ascending: false });

  if (q) {
    // öğrenci adında / veli / telefonda arama
    query = query.or(
      `students.student_name.ilike.%${q}%,students.parent_name.ilike.%${q}%,students.parent_phone_e164.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // UI’nin beklediği düz formata indir
  const items = (data || []).map((r: any) => ({
    id: r.id,                               // student_package_id
    student_id: r.student_id,
    student_name: r.students?.student_name ?? "—",
    parent_name: r.students?.parent_name ?? null,
    parent_phone_e164: r.students?.parent_phone_e164 ?? null,
    package_name: r.packages?.title ?? null,
    status: r.status,
    start_date: r.start_date,
  }));

  return NextResponse.json({ items }, { status: 200 });
}