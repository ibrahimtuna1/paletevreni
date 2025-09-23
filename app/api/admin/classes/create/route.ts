import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, capacity = 14, meeting_days = null } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Ad zorunlu" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("classes")
    .insert({ name: name.trim(), capacity: Number(capacity), meeting_days })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
