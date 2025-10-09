import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabaseServer";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const body = await req.json().catch(()=>({}));
  const student_id = body?.student_id as string | undefined;
  if (!student_id) return NextResponse.json({ error: "student_id gerekli" }, { status: 400 });

  // 1) öğrenciyi left
  const { error: e1 } = await supabase
    .from("students")
    .update({ status: "left" })
    .eq("id", student_id);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  // 2) varsa aktif paketini left yap (geçmiş silinmez)
  const { error: e2 } = await supabase
    .from("student_packages")
    .update({ status: "left" })
    .eq("student_id", student_id)
    .eq("status", "active");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}