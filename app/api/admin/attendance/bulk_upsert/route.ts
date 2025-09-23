// app/api/admin/attendance/bulk_upsert/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const role = (await cookies()).get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, date, items } = await req.json();
  if (!classId || !date || !Array.isArray(items)) {
    return NextResponse.json({ error: "classId/date/items gerekli" }, { status: 400 });
  }

  // upsert için tek tek unique key ile çalışıyoruz
  const rows = items.map((x: any) => ({
    class_id: classId,
    student_id: x.student_id,
    date,
    status: x.status,
    makeup_date: x.makeup_date || null,
  }));

  const { error } = await supabaseAdmin.from("attendance").upsert(rows, {
    onConflict: "class_id,student_id,date",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, upserted: rows.length });
}
