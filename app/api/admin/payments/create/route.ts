import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { student_id, amount, method, status = "paid", paid_at, period_start, period_end, note } =
    body || {};

  if (!student_id || amount == null || !method)
    return NextResponse.json({ error: "student_id, amount, method zorunlu" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      student_id,
      amount: Number(amount),
      method,
      status,
      paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
      period_start: period_start || null,
      period_end: period_end || null,
      note: note || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
