// app/api/admin/students/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    id,
    status,
    admin_note,
    start_date,
    end_date,
    trial_attended,
    attendance_status,
  } = await req.json();

  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const patch: any = {};
  if (status != null) patch.status = status;
  if (admin_note != null) patch.admin_note = admin_note;
  if (start_date !== undefined) patch.start_date = start_date || null;
  if (end_date !== undefined) patch.end_date = end_date || null;
  if (trial_attended !== undefined) patch.trial_attended = !!trial_attended;
  if (attendance_status !== undefined) patch.attendance_status = attendance_status || null;

  const { error } = await supabaseAdmin.from("students").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
