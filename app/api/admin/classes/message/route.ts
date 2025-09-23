import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, body } = (await req.json().catch(() => ({}))) as {
    classId?: string; body?: string;
  };
  if (!classId || !body?.trim()) {
    return NextResponse.json({ error: "classId ve body zorunlu" }, { status: 400 });
  }

  const { data: studs, error } = await supabaseAdmin
    .from("students")
    .select("parent_phone_e164")
    .eq("class_id", classId)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const recipients = (studs ?? []).map((s: any) => s.parent_phone_e164).filter(Boolean);

  return NextResponse.json({
    ok: true,
    queued: recipients.length,
    preview: { body, recipients },
  });
}
