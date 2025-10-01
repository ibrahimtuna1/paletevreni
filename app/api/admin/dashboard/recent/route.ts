// app/api/admin/dashboard/recent/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- 1) Son ödemeler (student_package_id ile)
  const { data: lastPays, error: pErr } = await supabaseAdmin
    .from("payments")
    .select("id, paid_at, amount, method, status, note, student_package_id")
    .order("paid_at", { ascending: false })
    .limit(8);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  // --- 2) İlgili paketleri çek
  const spIds = Array.from(
    new Set((lastPays ?? []).map((p) => p.student_package_id).filter(Boolean))
  ) as string[];

  let spById = new Map<string, { student_id: string }>();
  if (spIds.length > 0) {
    const { data: sps, error: spErr } = await supabaseAdmin
      .from("student_packages")
      .select("id, student_id")
      .in("id", spIds);

    if (spErr) return NextResponse.json({ error: spErr.message }, { status: 400 });
    spById = new Map((sps ?? []).map((sp: any) => [sp.id, { student_id: sp.student_id }]));
  }

  // --- 3) İlgili öğrencileri çek
  const studentIds = Array.from(
    new Set(
      Array.from(spById.values())
        .map((x) => x.student_id)
        .filter(Boolean)
    )
  ) as string[];

  let nameByStudentId = new Map<string, { student_name: string | null; parent_name: string | null }>();
  if (studentIds.length > 0) {
    const { data: studs, error: sErr1 } = await supabaseAdmin
      .from("students")
      .select("id, student_name, parent_name")
      .in("id", studentIds);

    if (sErr1) return NextResponse.json({ error: sErr1.message }, { status: 400 });
    nameByStudentId = new Map(
      (studs ?? []).map((s: any) => [s.id, { student_name: s.student_name, parent_name: s.parent_name }])
    );
  }

  // --- 4) Ödemeleri isimlerle birleştir
  const payments = (lastPays ?? []).map((p: any) => {
    const studentId = spById.get(p.student_package_id)?.student_id;
    const names = (studentId && nameByStudentId.get(studentId)) || {
      student_name: null,
      parent_name: null,
    };
    return {
      id: p.id,
      paid_at: p.paid_at,
      amount: Number(p.amount || 0),
      method: p.method,
      status: p.status || "paid", // tablo yoksa güvenli default
      student_name: names.student_name,
      parent_name: names.parent_name,
    };
  });

  // --- Son öğrenciler (değişmedi)
  const { data: lastStuds, error: sErr2 } = await supabaseAdmin
    .from("students")
    .select("id, student_name, parent_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (sErr2) return NextResponse.json({ error: sErr2.message }, { status: 400 });

  const students = (lastStuds ?? []).map((s: any) => ({
    id: s.id,
    student_name: s.student_name,
    parent_name: s.parent_name,
    status: s.status,
    created_at: s.created_at,
  }));

  return NextResponse.json({ payments, students });
}
