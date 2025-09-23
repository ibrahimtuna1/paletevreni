import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Son 30 gün
  const fromISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // counts (head:true + count:exact hızlıdır)
  const [{ count: students_total }, { count: students_active }, { count: classes_total }] =
    await Promise.all([
      supabaseAdmin.from("students").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("classes").select("id", { count: "exact", head: true }),
    ]);

  // Son 30 gün ödemeleri çek -> JS tarafında say ve hasılatı topla (refunded negatif sayılıyor)
  const { data: pays, error: payErr } = await supabaseAdmin
    .from("payments")
    .select("amount,status")
    .gte("paid_at", fromISO);

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 });

  const payments_count_30d = pays?.length || 0;
  const revenue_30d =
    pays?.reduce((acc: number, p: any) => {
      const amt = Number(p.amount || 0);
      if (p.status === "paid") return acc + amt;
      if (p.status === "refunded") return acc - amt;
      return acc;
    }, 0) || 0;

  return NextResponse.json({
    students_total: students_total || 0,
    students_active: students_active || 0,
    classes_total: classes_total || 0,
    payments_count_30d,
    revenue_30d,
  });
}
