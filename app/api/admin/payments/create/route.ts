// app/api/admin/payments/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) ?? {};

  // Yeni dünya: student_package_id zorunlu
  // (geri uyumluluk için student_id gönderildiyse son paketi bulmayı deneriz)
  let { student_package_id } = body as { student_package_id?: string };
  const {
    student_id, // eski client gönderiyorsa
    amount,
    method,
    status,           // default: "pending" (postpaid)
    paid_at,          // gerçek ödeme günü (opsiyonel)
    period_start,     // ders dönemi başlangıcı (opsiyonel)
    period_end,       // VADE günü (opsiyonel)
    note,
  } = body;

  // Geri uyumluluk: student_id varsa en güncel paketini yakala
  if (!student_package_id && student_id) {
    const { data: sp, error: spErr } = await supabaseAdmin
      .from("student_packages")
      .select("id")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!spErr && sp?.id) student_package_id = sp.id;
  }

  if (!student_package_id) {
    return NextResponse.json({ error: "student_package_id zorunlu" }, { status: 400 });
  }
  if (amount == null || Number.isNaN(Number(amount))) {
    return NextResponse.json({ error: "amount sayı olmalı" }, { status: 400 });
  }
  if (!["card", "cash", "transfer"].includes(method)) {
    return NextResponse.json({ error: "method geçersiz (card|cash|transfer)" }, { status: 400 });
  }

  // Paketin gerçekten var olduğundan emin ol
  const { data: spCheck, error: spCheckErr } = await supabaseAdmin
    .from("student_packages")
    .select("id")
    .eq("id", student_package_id)
    .single();

  if (spCheckErr || !spCheck) {
    return NextResponse.json({ error: "Geçersiz student_package_id" }, { status: 400 });
  }

  // Postpaid: default status = pending, paid_at sadece ödendiğinde dolar
  const clean = (v: any) => (v === "" ? null : v);
  const payload = {
    student_package_id,
    amount: Number(amount),
    method,
    status: (status ?? "pending") as "paid" | "pending" | "failed" | "refunded",
    paid_at: clean(paid_at) ? new Date(paid_at).toISOString() : null,
    period_start: clean(period_start),
    period_end: clean(period_end), // VADE
    note: clean(note),
  } as const;

  // Eğer status=paid gelip paid_at boşsa şimdiye set edelim
  const finalPayload = {
    ...payload,
    paid_at:
      payload.status === "paid"
        ? payload.paid_at ?? new Date().toISOString()
        : payload.paid_at, // pending/refunded vs: null kalabilir
  };

  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert(finalPayload)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 200 });
}
