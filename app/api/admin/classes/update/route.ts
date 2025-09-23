import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, capacity, meeting_days } = await req.json();
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  // kapasite düşürme validasyonu
  if (typeof capacity === "number") {
    const [{ data: cls }, { data: studs }] = await Promise.all([
      supabaseAdmin.from("classes").select("id, capacity").eq("id", id).single(),
      supabaseAdmin.from("students").select("id").eq("class_id", id),
    ]);
    const memberCount = (studs ?? []).length;
    if (capacity < memberCount) {
      return NextResponse.json(
        { error: `Kapasite ${memberCount} altına düşürülemez.` },
        { status: 400 }
      );
    }
  }

  const updates: any = {};
  if (name != null) updates.name = String(name).trim();
  if (capacity != null) updates.capacity = Number(capacity);
  if (meeting_days !== undefined) updates.meeting_days = meeting_days || null;

  const { error } = await supabaseAdmin.from("classes").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
