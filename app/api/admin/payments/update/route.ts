// app/api/admin/payments/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, student_id, amount, method, status, paid_at, period_start, period_end, note } = await req.json();
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("payments")
    .update({
      student_id,
      amount,
      method,
      status,
      paid_at,
      period_start,
      period_end, // artık kolon var
      note,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
