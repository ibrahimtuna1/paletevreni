// app/api/admin/students/message/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const role = (await cookies()).get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentIds, body } = await req.json();
  if (!Array.isArray(studentIds) || !studentIds.length || !body?.trim()) {
    return NextResponse.json({ error: "studentIds ve body gerekli" }, { status: 400 });
  }

  // burada istersen SMS/e-posta gönderimini yap
  // şimdilik sadece önizleme dönüyorum
  const { data: studs, error } = await supabaseAdmin
    .from("students")
    .select("id, parent_phone_e164, parent_name, student_name")
    .in("id", studentIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, queued: studs?.length ?? 0, preview: { body, recipients: studs } });
}
