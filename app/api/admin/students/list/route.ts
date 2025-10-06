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

  let query = supabaseAdmin
    .from("students")
    .select("id, student_name, parent_name, parent_phone_e164")
    .order("student_name", { ascending: true });

  if (q) {
    query = query.or(
      `student_name.ilike.%${q}%,parent_name.ilike.%${q}%,parent_phone_e164.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data ?? []).map((x: any) => ({
    id: x.id,
    student_name: x.student_name ?? "İsimsiz",
    parent_name: x.parent_name ?? null,
    parent_phone_e164: x.parent_phone_e164 ?? null,
  }));

  return NextResponse.json({ items });
}
