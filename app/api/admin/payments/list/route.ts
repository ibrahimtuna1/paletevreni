// app/api/admin/payments/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET(req: Request) {
  // --- yetki ---
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- query params ---
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "25");
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || "";
  const method = searchParams.get("method") || "";
  const studentPackageId = searchParams.get("studentPackageId") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  // --- sorgu (gömülü JOIN) ---
  // payments.* + student_packages + students(özet alanlar)
  let query = supabaseAdmin
    .from("payments")
    .select(`
      id,
      student_package_id,
      amount,
      method,
      status,
      paid_at,
      period_start,
      period_end,
      note,
      student_packages:student_package_id (
        id,
        students:student_id (
          student_name,
          parent_name,
          parent_phone_e164
        )
      )
    `, { count: "exact" })
    .order("paid_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (method) query = query.eq("method", method);
  if (studentPackageId) query = query.eq("student_package_id", studentPackageId);
  if (dateFrom) query = query.gte("paid_at", new Date(dateFrom).toISOString());
  if (dateTo)   query = query.lte("paid_at", new Date(dateTo + "T23:59:59").toISOString());
  if (q)        query = query.ilike("note", `%${q}%`); // basit arama: not içinde

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // --- UI şekline dönüştür ---
  const items = (data ?? []).map((p: any) => {
    const student = p?.student_packages?.students ?? null;
    return {
      id: p.id,
      student_package_id: p.student_package_id,
      amount: p.amount,
      method: p.method,
      status: p.status,
      paid_at: p.paid_at,
      period_start: p.period_start,
      period_end: p.period_end,
      note: p.note,
      // UI’ın beklediği alanlar:
      student_name: student?.student_name ?? null,
      parent_name: student?.parent_name ?? null,
      parent_phone_e164: student?.parent_phone_e164 ?? null,
    };
  });

  // --- özetler ---
  const totalRevenue = items.reduce((s, x) => s + (x.status === "paid" ? Number(x.amount || 0) : 0), 0);
  const countByStatus = items.reduce((m: any, x) => { m[x.status] = (m[x.status] || 0) + 1; return m; }, {});
  const methodBreakdown = items.reduce((m: any, x) => { m[x.method] = (m[x.method] || 0) + Number(x.amount || 0); return m; }, {});

  return NextResponse.json({
    items,
    total: count || 0,
    summary: { totalRevenue, countByStatus, methodBreakdown },
  });
}
