import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

function toDateOrNull(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const status = url.searchParams.get("status"); // paid/pending/failed/refunded
  const method = url.searchParams.get("method"); // card/cash/transfer
  const studentId = url.searchParams.get("studentId");
  const df = toDateOrNull(url.searchParams.get("date_from"));
  const dt = toDateOrNull(url.searchParams.get("date_to"));
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || "25")));

  // 1) tüm ödemeleri filtreleyip al (özet için)
  let base = supabaseAdmin.from("payments").select("*").order("paid_at", { ascending: false });

  if (status) base = base.eq("status", status);
  if (method) base = base.eq("method", method);
  if (studentId) base = base.eq("student_id", studentId);
  if (df) base = base.gte("paid_at", df);
  if (dt) base = base.lte("paid_at", dt);

  const { data: all, error: allErr } = await base;
  if (allErr) return NextResponse.json({ error: allErr.message }, { status: 400 });

  // 2) öğrencileri çekip isim eşleyelim (join yerine basit map)
  const { data: studs } = await supabaseAdmin
    .from("students")
    .select("id, student_name, parent_name, parent_phone_e164");

  const nameById = new Map((studs ?? []).map((s: any) => [s.id, s]));

  // q (free text) sadece JS tarafında (öğrenci/veli/telefon)
  const filtered = (all ?? []).filter((p: any) => {
    if (!q) return true;
    const s = nameById.get(p.student_id);
    const text = [
      s?.student_name || "",
      s?.parent_name || "",
      s?.parent_phone_e164 || "",
      p?.note || "",
      p?.method || "",
      p?.status || "",
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  });

  // summary
  const totalRevenue = filtered
    .filter((p: any) => p.status === "paid" || p.status === "refunded") // refunded'ı hasılattan düşmek istersen aşağıda -amount yap
    .reduce((acc: number, p: any) => acc + Number(p.amount || 0) * (p.status === "refunded" ? -1 : 1), 0);

  const countByStatus = filtered.reduce((m: any, p: any) => {
    m[p.status] = (m[p.status] || 0) + 1;
    return m;
  }, {} as Record<string, number>);

  const methodBreakdown = filtered.reduce((m: any, p: any) => {
    m[p.method] = (m[p.method] || 0) + Number(p.amount || 0) * (p.status === "refunded" ? -1 : 1);
    return m;
  }, {} as Record<string, number>);

  // sayfalama
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end).map((p: any) => {
    const s = nameById.get(p.student_id) || {};
    return {
      ...p,
      student_name: s.student_name || null,
      parent_name: s.parent_name || null,
      parent_phone_e164: s.parent_phone_e164 || null,
    };
  });

  return NextResponse.json({
    items: pageItems,
    total: filtered.length,
    page,
    pageSize,
    summary: {
      totalRevenue,
      countByStatus,
      methodBreakdown,
    },
  });
}
