// app/api/admin/studentpackages/last/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function addDaysISO(dateYMD: string, days: number) {
  // Y-m-d → Y-m-d (UTC, saat eklemeden)
  const d = new Date(`${dateYMD}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    // cookie okuma SYNC
    const c = await cookies();
    const isAdmin = (c.get("admin_session")?.value || "") === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const student_id = url.searchParams.get("student_id") || "";
    const histParam = (url.searchParams.get("history") || "").toLowerCase();
    const withHistory = histParam === "1" || histParam === "true" || histParam === "yes";

    if (!student_id) {
      return NextResponse.json({ error: "student_id gerekli" }, { status: 400 });
    }

    // --- Son paket (FOR UPDATE yok) ---
    // İlişkiyi net: pkg:packages(...)
    const sel = `
      id, start_date, status, sessions_total, price_at_purchase,
      pkg:packages(id, title, valid_weeks, total_sessions)
    `;
    const { data, error } = await supabaseAdmin
      .from("student_packages")
      .select(sel)
      .eq("student_id", student_id)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let item: any = null;
    if (data) {
      const d: any = data as any;
      const weeks = (d.pkg?.valid_weeks ?? d.sessions_total ?? 4) as number;
      const end_date = d.start_date ? addDaysISO(String(d.start_date), weeks * 7 - 1) : null;
      item = {
        id: d.id,
        start_date: d.start_date,
        end_date,
        package_title: d.pkg?.title ?? null,
        sessions_total: d.sessions_total ?? null,
        price_at_purchase: d.price_at_purchase ?? null,
        status: d.status,
      };
    }

    // --- Geçmiş istenirse ---
    let history: any[] | undefined = undefined;
    if (withHistory) {
      const { data: hist, error: hErr } = await supabaseAdmin
        .from("student_packages")
        .select(`
          id, start_date, status, sessions_total, price_at_purchase,
          pkg:packages(title, valid_weeks, total_sessions)
        `)
        .eq("student_id", student_id)
        .order("start_date", { ascending: false });

      if (!hErr) {
        history = (hist || []).map((h: any) => {
          const w = (h.pkg?.valid_weeks ?? h.sessions_total ?? 4) as number;
          return {
            id: h.id,
            start_date: h.start_date,
            end_date: h.start_date ? addDaysISO(String(h.start_date), w * 7 - 1) : null,
            package_title: h.pkg?.title ?? null,
            sessions_total: h.sessions_total ?? null,
            price_at_purchase: h.price_at_purchase ?? null,
            status: h.status,
          };
        });
      } else {
        history = [];
      }
    }

    return NextResponse.json({ item, history }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected_error" }, { status: 500 });
  }
}