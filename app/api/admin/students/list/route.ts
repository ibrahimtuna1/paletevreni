// app/api/admin/students/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const assigned = url.searchParams.get("assigned"); // 'none' | null
  const status = url.searchParams.get("status");     // 'active' | 'paused' | 'left' | null
  const q = url.searchParams.get("q")?.trim() || "";

  let qy = supabaseAdmin.from("students").select("*").order("created_at", { ascending: false });

  if (classId) qy = qy.eq("class_id", classId);
  else if (assigned === "none") qy = qy.is("class_id", null);

  if (status === "active" || status === "paused" || status === "left") {
    qy = qy.eq("status", status);
  }

  if (q) {
    // öğrenci adı, veli adı, telefon içinde arama
    qy = qy.or(
      `student_name.ilike.%${q}%,parent_name.ilike.%${q}%,parent_phone_e164.ilike.%${q}%`
    );
  }

  const { data, error } = await qy;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: classes } = await supabaseAdmin.from("classes").select("id,name,capacity");
  const map = new Map((classes ?? []).map((c: any) => [c.id, { name: c.name, capacity: c.capacity }]));

  const items = (data ?? []).map((s: any) => ({
    ...s,
    class_name: s.class_id ? map.get(s.class_id)?.name ?? null : null,
  }));

  return NextResponse.json({ items });
}
