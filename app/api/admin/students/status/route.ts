// app/api/admin/students/status/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

type Status = "active" | "paused" | "left";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, status, unassign }: { studentId: string; status: Status; unassign?: boolean } =
    await req.json();

  if (!studentId || !["active", "paused", "left"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz parametre" }, { status: 400 });
  }

  // status geçiş kuralları:
  // - left => class_id null
  // - paused => opsiyonel olarak unassign true ise class_id null
  // - active => class_id değişmeden kalır
  const patch: any = { status };
  if (status === "left") patch.class_id = null;
  if (status === "paused" && unassign) patch.class_id = null;

  const { error } = await supabaseAdmin.from("students").update(patch).eq("id", studentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
