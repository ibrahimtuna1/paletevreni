import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || "";
  const method = searchParams.get("method") || "";
  const date_from = searchParams.get("date_from") || "";
  const date_to = searchParams.get("date_to") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 25);

  // Geniş çekip JS'te "son ödeme"yi öğrenci başına seçeceğiz.
  // (DISTINCT ON yerine pratik çözüm)
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(`
      id, student_package_id, amount, method, status, paid_at, period_start, period_end, note, created_at,
      student_packages:student_package_id (
        id, student_id, start_date, package_id,
        students:students ( id, student_name, parent_name, parent_phone_e164 ),
        packages:packages ( id, title )
      )
    `)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    student_package_id: r.student_package_id,
    student_id: r.student_packages?.students?.id,
    student_name: r.student_packages?.students?.student_name ?? "—",
    parent_name: r.student_packages?.students?.parent_name ?? null,
    parent_phone_e164: r.student_packages?.students?.parent_phone_e164 ?? null,
    package_name: r.student_packages?.packages?.title ?? null,
    amount: Number(r.amount || 0),
    method: r.method,
    status: r.status,
    paid_at: r.paid_at,
    period_start: r.period_start,
    period_end: r.period_end,
    note: r.note,
    created_at: r.created_at,
  }));

  // Filtre
  const filtered = rows.filter((x) => {
    if (status && x.status !== status) return false;
    if (method && x.method !== method) return false;
    if (date_from && ((x.paid_at || x.period_start || "").slice(0,10) < date_from)) return false;
    if (date_to && ((x.paid_at || x.period_end   || "").slice(0,10) > date_to)) return false;
    if (q) {
      const hay = `${x.student_name} ${x.parent_name} ${x.parent_phone_e164} ${x.note || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Öğrenci başına tek satır (en yeni)
  const pick: Record<string, any> = {};
  for (const r of filtered) {
    const sid = r.student_id || "unknown";
    if (!pick[sid]) pick[sid] = r;
  }
  const uniq = Object.values(pick) as any[];

  // Sayfalama
  const total = uniq.length;
  const start = (page - 1) * pageSize;
  const items = uniq.slice(start, start + pageSize);

  // Özet
  const summary = {
    totalRevenue: items.filter(x => x.status === "paid").reduce((s,x)=>s + (x.amount||0), 0),
    countByStatus: {
      paid:    items.filter(x => x.status === "paid").length,
      pending: items.filter(x => x.status === "pending").length,
      failed:  items.filter(x => x.status === "failed").length,
      refunded:items.filter(x => x.status === "refunded").length,
    },
    methodBreakdown: {
      card:     items.filter(x => x.status==="paid" && x.method==="card").reduce((s,x)=>s+(x.amount||0),0),
      cash:     items.filter(x => x.status==="paid" && x.method==="cash").reduce((s,x)=>s+(x.amount||0),0),
      transfer: items.filter(x => x.status==="paid" && x.method==="transfer").reduce((s,x)=>s+(x.amount||0),0),
    }
  };

  return NextResponse.json({ items, total, summary });
}