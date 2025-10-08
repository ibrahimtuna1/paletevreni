// app/api/admin/studentpackages/last/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDaysStr(ymd: string, days: number) {
  const d = new Date(ymd);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

export async function GET(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const student_id = searchParams.get("student_id");
  if (!student_id) {
    return NextResponse.json({ error: "student_id gerekli" }, { status: 400 });
  }

  // Son kaydı start_date DESC + created_at fallback ile bul
  const { data, error } = await supabaseAdmin
    .from("student_packages")
    .select("id, package_id, start_date, created_at")
    .eq("student_id", student_id)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data || data.length === 0) {
    return NextResponse.json({ period_start: null, period_end: null, package_id: null, duration_days: null });
  }

  const row = data[0] as any;
  const period_start: string | null = row.start_date ?? null;

  // Paketten valid_weeks çek
  let duration_days: number | null = null;
  let period_end: string | null = null;

  if (row.package_id) {
    const { data: pack, error: perr } = await supabaseAdmin
      .from("packages")
      .select("valid_weeks")
      .eq("id", row.package_id)
      .maybeSingle();

    if (!perr && pack) {
      const weeks = (pack as any).valid_weeks;
      if (typeof weeks === "number" && period_start) {
        duration_days = weeks * 7;
        // Son ders = ilk dersten (weeks - 1) hafta sonrası
        period_end = addDaysStr(period_start, (weeks - 1) * 7);
      }
    }
  }

  return NextResponse.json({
    period_start,
    period_end,
    package_id: row.package_id ?? null,
    duration_days,
  });
}