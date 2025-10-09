// app/api/admin/payments/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function applyFilters(q: any, { qtext, status, method, date_from, date_to }: any) {
  if (qtext) {
    q = q.or(
      `student_name.ilike.%${qtext}%,parent_name.ilike.%${qtext}%,parent_phone_e164.ilike.%${qtext}%`
    );
  }
  if (status) q = q.eq("status", status);
  if (method) q = q.eq("method", method);
  if (date_from) q = q.gte("paid_at", date_from);
  if (date_to) q = q.lte("paid_at", date_to);
  return q;
}

// basit yardımcılar
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const later = (a?: string | null, b?: string | null) => {
  if (!a) return b || null;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
};
const earlier = (a?: string | null, b?: string | null) => {
  if (!a) return b || null;
  if (!b) return a;
  return new Date(a) < new Date(b) ? a : b;
};

export async function GET(req: Request) {
  try {
    const c = await cookies();
    if ((c.get("admin_session")?.value || "") !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const qtext = (url.searchParams.get("q") || "").trim();
    const status = url.searchParams.get("status") || "";
    const method = url.searchParams.get("method") || "";
    const studentPackageId = url.searchParams.get("studentPackageId") || "";
    const date_from = url.searchParams.get("date_from") || "";
    const date_to = url.searchParams.get("date_to") || "";
    const mode = (url.searchParams.get("mode") || "aggregate").toLowerCase(); // "aggregate" | "raw"

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "25")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // ---------- RAW (tek tek ödeme satırı) ----------
    if (mode === "raw") {
      let q = supabaseAdmin
        .from("v_payment_rows")
        .select(
          `
          id,
          student_package_id,
          student_id,
          student_name,
          parent_name,
          parent_phone_e164,
          amount,
          method,
          status,
          paid_at,
          period_start,
          period_end,
          note
        `,
          { count: "exact" }
        );

      q = applyFilters(q, { qtext, status, method, date_from, date_to });
      if (studentPackageId) q = q.eq("student_package_id", studentPackageId);
      q = q.order("paid_at", { ascending: false }).range(from, to);

      const { data, error, count } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // summary (raw)
      const { data: sumRow } = await applyFilters(
        supabaseAdmin.from("v_payment_rows").select("total:amount.sum()").single(),
        { qtext, status, method, date_from, date_to }
      );

      const summary = {
        totalRevenue: Number((sumRow as any)?.total || 0),
        countByStatus: {
          paid:
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("id", { count: "exact", head: true }).eq("status", "paid"),
              { qtext, method, date_from, date_to }
            )).count || 0,
          pending:
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("id", { count: "exact", head: true }).eq("status", "pending"),
              { qtext, method, date_from, date_to }
            )).count || 0,
          failed:
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("id", { count: "exact", head: true }).eq("status", "failed"),
              { qtext, method, date_from, date_to }
            )).count || 0,
          refunded:
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("id", { count: "exact", head: true }).eq("status", "refunded"),
              { qtext, method, date_from, date_to }
            )).count || 0,
        },
        methodBreakdown: {
          card: Number(
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("t:amount.sum()").eq("method", "card").single(),
              { qtext, status, date_from, date_to }
            )).data?.t || 0
          ),
          cash: Number(
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("t:amount.sum()").eq("method", "cash").single(),
              { qtext, status, date_from, date_to }
            )).data?.t || 0
          ),
          transfer: Number(
            (await applyFilters(
              supabaseAdmin.from("v_payment_rows").select("t:amount.sum()").eq("method", "transfer").single(),
              { qtext, status, date_from, date_to }
            )).data?.t || 0
          ),
        },
      };

      return NextResponse.json({ items: data, total: count || 0, summary }, { status: 200 });
    }

    // ---------- AGGREGATE (öğrenci başına tek satır + TOPLAM) ----------
    // 1) Önce *filtrelenmiş tüm ödeme satırlarını* çek
    let base = supabaseAdmin
      .from("v_payment_rows")
      .select(
        `
        id,
        student_id,
        student_package_id,
        student_name,
        parent_name,
        parent_phone_e164,
        amount,
        method,
        status,
        paid_at,
        period_start,
        period_end,
        note
      `
      );

    base = applyFilters(base, { qtext, status, method, date_from, date_to });
    if (studentPackageId) base = base.eq("student_package_id", studentPackageId);

    // limit/offset'i burada uygulamıyoruz; gruplama sonrası sayfalarız
    const { data: rows, error: e1 } = await base.limit(10000); // küçük dataset—ok; çok büyürse RPC/VIEW'e geçeriz
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

    // 2) In-memory gruplama (student_id)
    type Agg = {
      id: string; // student_id
      student_package_id: string; // aggregate modda boş bırakacağız
      student_name: string | null;
      parent_name: string | null;
      parent_phone_e164: string | null;
      amount: number;
      method: "card" | "cash" | "transfer";
      status: "paid" | "pending" | "failed" | "refunded";
      paid_at: string | null;      // last_paid
      period_start: string | null; // min
      period_end: string | null;   // max
      note: string | null;
      _last_paid: string | null;
    };

    const map = new Map<string, Agg>();
    let revenueSum = 0;
    const statusCounts: Record<string, number> = { paid: 0, pending: 0, failed: 0, refunded: 0 };
    const methodSums: Record<string, number> = { card: 0, cash: 0, transfer: 0 };

    for (const r of rows || []) {
      const sid = r.student_id as string;
      const amt = num(r.amount);
      revenueSum += amt;

      if (r.status && statusCounts[r.status] !== undefined) statusCounts[r.status] += 1;
      if (r.method && methodSums[r.method] !== undefined) methodSums[r.method] += amt;

      const prev = map.get(sid);
      if (!prev) {
        map.set(sid, {
          id: sid,
          student_package_id: "",
          student_name: r.student_name ?? null,
          parent_name: r.parent_name ?? null,
          parent_phone_e164: r.parent_phone_e164 ?? null,
          amount: amt,
          method: (r.method as any) || "transfer",
          status: (r.status as any) || "paid",
          paid_at: r.paid_at ?? null,
          _last_paid: r.paid_at ?? null,
          period_start: r.period_start ?? null,
          period_end: r.period_end ?? null,
          note: null,
        });
      } else {
        prev.amount += amt;
        prev.method = (r.method as any) || prev.method;
        prev.status = (r.status as any) || prev.status;
        prev._last_paid = later(prev._last_paid, r.paid_at);
        prev.paid_at = prev._last_paid;
        prev.period_start = earlier(prev.period_start, r.period_start);
        prev.period_end = later(prev.period_end, r.period_end);
      }
    }

    // 3) Liste + sıralama + sayfalama
    const list = Array.from(map.values()).sort((a, b) => {
      const ax = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const bx = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return bx - ax; // desc
    });

    const total = list.length;
    const paged = list.slice(from, to + 1);

    const summary = {
      totalRevenue: revenueSum,
      countByStatus: {
        paid: statusCounts.paid,
        pending: statusCounts.pending,
        failed: statusCounts.failed,
        refunded: statusCounts.refunded,
      },
      methodBreakdown: {
        card: methodSums.card,
        cash: methodSums.cash,
        transfer: methodSums.transfer,
      },
    };

    return NextResponse.json({ items: paged, total, summary }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unexpected_error" }, { status: 500 });
  }
}