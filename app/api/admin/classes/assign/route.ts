import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, classId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId zorunlu" }, { status: 400 });

  // Unassign ise direkt boşalt
  if (!classId) {
    const { error } = await supabaseAdmin
      .from("students")
      .update({ class_id: null })
      .eq("id", studentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Kapasite kontrolü (sunucu tarafı)
  const [{ data: cls }, { data: studs }] = await Promise.all([
    supabaseAdmin.from("classes").select("id, capacity").eq("id", classId).single(),
    supabaseAdmin.from("students").select("id").eq("class_id", classId),
  ]);
  if (!cls) return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 });
  const memberCount = (studs ?? []).length;
  if (memberCount >= (cls as any).capacity) {
    return NextResponse.json({ error: "Sınıf dolu" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("students")
    .update({ class_id: classId })
    .eq("id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
