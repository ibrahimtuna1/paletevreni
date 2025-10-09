import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Öğrenci listesi + aktif paket özeti
 * - students tablosundan çekilir
 * - aynı anda student_packages (status='active') + packages bilgisi eklenir (end_date hesaplanır)
 * - Frontend'in beklediği alanlar: id, student_name, parent_name, parent_phone_e164, student_package_id, package_name, valid_weeks, sessions_total, start_date, end_date
 */
export async function GET(req: Request) {
  // basit admin guard (prod'da kontrol et, dev'de engelleme)
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // 1) Öğrencileri çek
  let sQuery = supabaseAdmin
    .from("students")
    .select("id, student_name, parent_name, parent_phone_e164")
    .order("student_name", { ascending: true });

  if (q) {
    sQuery = sQuery.or(
      `student_name.ilike.%${q}%,parent_name.ilike.%${q}%,parent_phone_e164.ilike.%${q}%`
    );
  }

  const { data: sRows, error: sErr } = await sQuery;
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const studentIds = (sRows ?? []).map((r) => r.id);
  if (studentIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // 2) Bu öğrencilerin aktif paketlerini çek
  // NOT: student_packages.end_date kolonu yok; end_date'yi hesaplayacağız
  const { data: spRows, error: spErr } = await supabaseAdmin
    .from("student_packages")
    .select(`
      id,
      student_id,
      status,
      start_date,
      price_at_purchase,
      sessions_total,
      sessions_used,
      package_id,
      packages:packages (
        id,
        code,
        title,
        total_price,
        total_sessions,
        valid_weeks
      )
    `)
    .in("student_id", studentIds)
    .eq("status", "active");

  if (spErr) return NextResponse.json({ error: spErr.message }, { status: 400 });

  // yardımcılar
  const toISODate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  const addDays = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return toISODate(d);
  };

  // 3) Öğrenci -> aktif paket eşlemesi (birden fazla varsa en yeni start_date'i seç)
  type Packed = {
    sp: any;
    pkg: any;
    computedEnd: string | null;
  };
  const byStudent: Record<string, Packed> = {};
  for (const r of spRows ?? []) {
    const pkg = (r as any)?.packages || null;

    const choose = () => {
      // kaç hafta?
      const weeks: number =
        (typeof pkg?.valid_weeks === "number" && pkg.valid_weeks > 0 ? pkg.valid_weeks : null) ??
        (typeof pkg?.total_sessions === "number" && pkg.total_sessions > 0 ? pkg.total_sessions : null) ??
        (typeof r.sessions_total === "number" && r.sessions_total > 0 ? r.sessions_total : null) ??
        4;

      let computedEnd: string | null = null;
      if (r.start_date) {
        // son ders = start + (weeks*7 - 1)
        computedEnd = addDays(r.start_date, Math.max(0, weeks * 7 - 1));
      }
      return { sp: r, pkg, computedEnd } as Packed;
    };

    const cur = byStudent[r.student_id];
    if (!cur) {
      byStudent[r.student_id] = choose();
    } else {
      // en güncel start_date'i al
      const curStart = cur.sp.start_date ? new Date(cur.sp.start_date).getTime() : 0;
      const newStart = r.start_date ? new Date(r.start_date).getTime() : 0;
      if (newStart >= curStart) {
        byStudent[r.student_id] = choose();
      }
    }
  }

  // 4) Son response: öğrenciler + aktif paketten gelen alanlar (end_date hesaplanmış)
  const items = (sRows ?? []).map((x: any) => {
    const entry = byStudent[x.id];
    const sp = entry?.sp;
    const pkg = entry?.pkg;
    return {
      id: x.id,
      student_name: x.student_name ?? "İsimsiz",
      parent_name: x.parent_name ?? null,
      parent_phone_e164: x.parent_phone_e164 ?? null,

      // aktif paket özeti (frontend uyumu için alan adları)
      student_package_id: sp?.id ?? null,
      package_name: pkg?.title ?? null,
      valid_weeks: pkg?.valid_weeks ?? null,
      sessions_total: sp?.sessions_total ?? pkg?.total_sessions ?? null,
      start_date: sp?.start_date ?? null,
      end_date: entry?.computedEnd ?? null, // HESAPLANMIŞ
      price_at_purchase: sp?.price_at_purchase ?? null,
    };
  });

  return NextResponse.json({ items });
}
