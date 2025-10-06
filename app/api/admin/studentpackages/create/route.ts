// app/api/admin/student-packages/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickSessionsTotal(pkg: any): number {
  const direct =
    pkg?.sessions_total ??
    pkg?.total_sessions ??
    pkg?.sessions_count ??
    pkg?.sessions ??
    pkg?.lessons_total ??
    pkg?.lessons_count ??
    null;

  if (typeof direct === "number") return direct;

  const weeks = pkg?.weeks;
  const months = pkg?.months;
  const spw = pkg?.sessions_per_week;
  const spm = pkg?.sessions_per_month;
  if (typeof spw === "number" && typeof weeks === "number") return spw * weeks;
  if (typeof spm === "number" && typeof months === "number") return spm * months;

  return 0; // fallback
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { student_id, package_id } = body || {};
  let {
    status = "active",
    start_date,
    price_at_purchase,
    sessions_total,
    sessions_used,
  } = body || {};

  if (!student_id || !package_id) {
    return NextResponse.json({ error: "student_id ve package_id zorunlu" }, { status: 400 });
  }

  // 1) Zaten aktif/paused kaydı var mı? => varsa onu dön
  {
    const { data: exists, error: exErr } = await supabaseAdmin
      .from("student_packages")
      .select("id,status")
      .eq("student_id", student_id)
      .eq("package_id", package_id)
      .in("status", ["active", "paused"])
      .limit(1)
      .maybeSingle();

    if (!exErr && exists?.id) {
      return NextResponse.json({ id: exists.id, reused: true });
    }
  }

  // 2) sessions_total yoksa paketten türet
  if (sessions_total == null) {
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("*")
      .eq("id", package_id)
      .maybeSingle();

    if (pkgErr) return NextResponse.json({ error: pkgErr.message }, { status: 400 });
    sessions_total = pickSessionsTotal(pkg);
  }

  if (sessions_used == null) sessions_used = 0;

  const insert = {
    student_id,
    package_id,
    status,
    start_date: start_date || new Date().toISOString().slice(0, 10),
    price_at_purchase: price_at_purchase ?? null,
    sessions_total,
    sessions_used,
  };

  // 3) Insert dene; duplicate olursa yakala ve mevcut kaydı dön
  const { data, error } = await supabaseAdmin
    .from("student_packages")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    // duplicate (unique) hatası geldiyse mevcut kaydı çek ve dön
    if ((error as any)?.code === "23505" || String(error.message).includes("duplicate key")) {
      const { data: exists2 } = await supabaseAdmin
        .from("student_packages")
        .select("id")
        .eq("student_id", student_id)
        .eq("package_id", package_id)
        .in("status", ["active", "paused"])
        .limit(1)
        .maybeSingle();

      if (exists2?.id) return NextResponse.json({ id: exists2.id, reused: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, reused: false });
}
