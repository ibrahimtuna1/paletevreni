import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // son 6 ay
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  const fromISO = from.toISOString();

  // Supabase'ta aggregate için tüm kayıtları çekip JS’te gruplayacağız (az veri varsayımı)
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("amount,status,paid_at")
    .gte("paid_at", fromISO)
    .order("paid_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const buckets: Record<string, number> = {};
  for (const p of data || []) {
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const sign = p.status === "refunded" ? -1 : p.status === "paid" ? 1 : 0;
    buckets[key] = (buckets[key] || 0) + Number(p.amount || 0) * sign;
  }

  const series = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ({ month: k, revenue: v }));

  return NextResponse.json({ series });
}
