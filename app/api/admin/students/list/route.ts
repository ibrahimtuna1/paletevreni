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
  const withTotals = url.searchParams.get("withTotals") === "1";

  let qy = supabaseAdmin
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (classId) qy = qy.eq("class_id", classId);
  else if (assigned === "none") qy = qy.is("class_id", null);

  if (status === "active" || status === "paused" || status === "left") {
    qy = qy.eq("status", status);
  }

  if (q) {
    qy = qy.or(
      `student_name.ilike.%${q}%,parent_name.ilike.%${q}%,parent_phone_e164.ilike.%${q}%`
    );
  }

  const { data, error } = await qy;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // sınıf isimleri
  const { data: classes } = await supabaseAdmin.from("classes").select("id,name,capacity");
  const map = new Map((classes ?? []).map((c: any) => [c.id, { name: c.name, capacity: c.capacity }]));

  const items = (data ?? []).map((s: any) => ({
    ...s,
    class_name: s.class_id ? map.get(s.class_id)?.name ?? null : null,
  }));

  // opsiyonel: toplamlar
  let totals: { all: number; active: number; paused: number; left: number } | undefined;
  if (withTotals) {
    const { data: tdata, error: terr } = await supabaseAdmin
      .from("students")
      .select("status", { count: "exact", head: false });
    if (!terr) {
      const active = tdata.filter((x: any) => x.status === "active").length;
      const paused = tdata.filter((x: any) => x.status === "paused").length;
      const left   = tdata.filter((x: any) => x.status === "left").length;
      totals = { all: tdata.length, active, paused, left };
    }
  }

  return NextResponse.json({ items, ...(withTotals ? { totals } : {}) });
}
