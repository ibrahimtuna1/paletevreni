import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

async function checkAuth() {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const unauth = await checkAuth(); if (unauth) return unauth;

  const url = new URL(req.url);
  const d = url.searchParams.get("d"); // YYYY-MM-DD
  if (!d) return NextResponse.json({ error: "d parametresi gerekli" }, { status: 400 });

  const start = new Date(`${d}T00:00:00`);
  const end = new Date(`${d}T23:59:59.999`);

  const { data, error } = await supabaseAdmin
    .from("tanitim_dersi_ogrencileri")
    .select("id, student_name, parent_name, parent_phone_e164, age, scheduled_at, status, admin_note, created_at")
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
