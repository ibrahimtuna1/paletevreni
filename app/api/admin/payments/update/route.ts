// app/api/admin/payments/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

// Ortak handler: PATCH ve POST aynı mantık
async function handleUpdate(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    id,
    // DİKKAT: student_id değil, student_package_id kullanıyoruz
    student_package_id,
    amount,
    method,
    status,
    paid_at,
    period_start,
    period_end,
    note,
  } = body ?? {};

  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  // Sadece gönderilmiş alanları güncelle
  const patch: Record<string, any> = {};

  if (student_package_id !== undefined)
    patch.student_package_id = student_package_id || null;

  if (amount !== undefined) {
    // "" -> null, sayı -> number
    if (amount === "" || amount === null) patch.amount = null;
    else {
      const n = Number(amount);
      if (Number.isNaN(n)) {
        return NextResponse.json({ error: "amount sayı olmalı" }, { status: 400 });
      }
      patch.amount = n;
    }
  }

  if (method !== undefined) patch.method = method || null;
  if (status !== undefined) patch.status = status || null;

  // paid_at DB’de timestamp/timestamptz ise ISO bekler; date ise "YYYY-MM-DD" kalabilir.
  if (paid_at !== undefined) patch.paid_at = paid_at || null;
  if (period_start !== undefined) patch.period_start = period_start || null; // genelde DATE kolonu
  if (period_end !== undefined) patch.period_end = period_end || null;       // genelde DATE kolonu

  if (note !== undefined) patch.note = note || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("payments").update(patch).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  return handleUpdate(req);
}

// Frontend fallback için POST’u da destekleyelim
export async function POST(req: Request) {
  return handleUpdate(req);
}
