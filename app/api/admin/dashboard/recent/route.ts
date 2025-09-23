import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Son ödemeler (öğrenci isimleriyle)
  const [{ data: lastPays, error: pErr }, { data: studs }] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("students")
      .select("id,student_name,parent_name")
  ]);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  const nameById = new Map((studs ?? []).map((s: any) => [s.id, s]));
  const payments = (lastPays ?? []).map((p: any) => ({
    id: p.id,
    paid_at: p.paid_at,
    amount: Number(p.amount || 0),
    method: p.method,
    status: p.status,
    student_name: nameById.get(p.student_id)?.student_name || null,
    parent_name: nameById.get(p.student_id)?.parent_name || null,
  }));

  // Son öğrenciler
  const { data: lastStuds, error: sErr } = await supabaseAdmin
    .from("students")
    .select("id,student_name,parent_name,status,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const students = (lastStuds ?? []).map((s: any) => ({
    id: s.id,
    student_name: s.student_name,
    parent_name: s.parent_name,
    status: s.status,
    created_at: s.created_at,
  }));

  return NextResponse.json({ payments, students });
}
