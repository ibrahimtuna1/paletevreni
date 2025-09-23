import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const allowed = ["student_id", "amount", "method", "status", "paid_at", "period_start", "period_end", "note"];
  const payload: any = {};
  for (const k of allowed) {
    if (k in patch) payload[k] = patch[k];
  }
  if ("amount" in payload) payload.amount = Number(payload.amount);
  if ("paid_at" in payload && payload.paid_at) payload.paid_at = new Date(payload.paid_at).toISOString();

  const { error } = await supabaseAdmin.from("payments").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
