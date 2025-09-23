// app/api/admin/attendance/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET(req: Request) {
  const role = (await cookies()).get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId")!;
  const date = searchParams.get("date")!;
  if (!classId || !date) return NextResponse.json({ error: "classId/date gerekli" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("student_id, status, makeup_date")
    .eq("class_id", classId)
    .eq("date", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
