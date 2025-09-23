import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  // auth
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const student_name = (body?.student_name as string | undefined)?.trim();
  const parent_name  = (body?.parent_name  as string | undefined)?.trim();
  const parent_phone = (body?.parent_phone as string | undefined)?.trim();
  const age          = body?.age as number | undefined;
  const scheduledAt  = body?.scheduled_at as string | undefined;

  if (!student_name || !parent_name || !parent_phone || !scheduledAt) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("create_manual_trial", {
    p_student_name: student_name,
    p_parent_name: parent_name,
    p_parent_phone: parent_phone,
    p_age: age ?? null,
    p_scheduled_at: new Date(scheduledAt).toISOString(),
    p_admin: "panel",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data });
}
