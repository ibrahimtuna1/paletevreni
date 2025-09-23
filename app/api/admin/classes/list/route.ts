import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: classes, error: cErr } = await supabaseAdmin
    .from("classes")
    .select("id, name, capacity, meeting_days, created_at")
    .order("name", { ascending: true });

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

  // Üyelik sayılarını hesapla (tek sorgu + JS)
  const { data: studs, error: sErr } = await supabaseAdmin
    .from("students")
    .select("class_id");

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const counts = new Map<string, number>();
  (studs ?? []).forEach((s: any) => {
    if (s.class_id) counts.set(s.class_id, (counts.get(s.class_id) || 0) + 1);
  });

  const items = (classes ?? []).map((c: any) => ({
    ...c,
    member_count: counts.get(c.id) || 0,
  }));

  return NextResponse.json({ items });
}
