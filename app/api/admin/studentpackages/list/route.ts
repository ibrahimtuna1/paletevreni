// app/api/admin/student-packages/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // ÖNEMLİ: packages(*) -> name alanı yoksa da patlamaz
  let query = supabaseAdmin
    .from("student_packages")
    .select(`
      id,
      student_id,
      package_id,
      status,
      price_at_purchase,
      sessions_total,
      sessions_used,
      start_date,
      created_at,
      students:student_id (
        id,
        student_name,
        parent_name,
        parent_phone_e164
      ),
      packages:package_id ( * )
    `)
    .order("student_name", { ascending: true, foreignTable: "students" })
    .limit(200);

  if (q) {
    // Şimdilik sadece öğrenci adında arayalım (stabil)
    query = query.ilike("students.student_name", `%${q}%`);
    // İleri seviye istersek (adı/veli/telefon):
    // query = query.or(
    //   `students.student_name.ilike.%${q}%,students.parent_name.ilike.%${q}%,students.parent_phone_e164.ilike.%${q}%`
    // );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data ?? []).map((x: any) => {
    const pkg = x.packages || {};
    // kolon adı neyse oradan yakala
    const package_name =
      pkg.name ??
      pkg.title ??
      pkg.package_name ??
      pkg.label ??
      null;

    return {
      id: x.id,                     // == student_package_id
      student_package_id: x.id,     // UI için açık
      student_name: x.students?.student_name ?? "İsimsiz",
      parent_name: x.students?.parent_name ?? null,
      parent_phone_e164: x.students?.parent_phone_e164 ?? null,
      package_name,
    };
  });

  return NextResponse.json({ items });
}
