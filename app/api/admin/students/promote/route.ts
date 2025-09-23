import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const trialId = (body?.trialId as string | undefined)?.trim();
  const packageId = (body?.packageId as string | undefined)?.trim();
  const paidAmount = Number(body?.paidAmount ?? 0);
  const paidAt = body?.paidAt as string | undefined;
  const method = (body?.method as string | undefined) || "other";

  if (!trialId || !packageId) {
    return NextResponse.json({ error: "trialId ve packageId gerekli" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("promote_trial_to_student_with_package", {
    p_trial_id: trialId,
    p_package_id: packageId,
    p_paid_amount: isFinite(paidAmount) ? paidAmount : 0,
    p_paid_at: paidAt ?? null,
    p_method: method,
    p_admin: "panel"
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data });
}
