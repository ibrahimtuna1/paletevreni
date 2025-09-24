// app/api/admin/student-packages/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  let query = supabaseAdmin
    .from("student_packages")
    .select(`
      id,
      student_id,
      package_id,
      students:student_id (
        id,
        student_name,
        parent_name,
        parent_phone_e164
      ),
      packages:package_id (
        id,
        name
      )
    `)
    .order("student_name", { ascending: true, foreignTable: "students" });

  if (q) query = query.ilike("students.student_name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data ?? []).map((x: any) => ({
    id: x.id, // == student_package_id
    student_package_id: x.id, // UI için açık açık
    student_name: x.students?.student_name ?? "İsimsiz",
    parent_name: x.students?.parent_name ?? null,
    parent_phone_e164: x.students?.parent_phone_e164 ?? null,
    package_name: x.packages?.name ?? null,
  }));

  return NextResponse.json({ items });
}
