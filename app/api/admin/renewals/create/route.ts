import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Sadece ihtiyacımız olan parametreleri alıyoruz
  const { student_id, package_id, method, note, start_date } = body || {};

  if (!student_id || !package_id) {
    return NextResponse.json({ error: "Öğrenci ve paket seçimi zorunludur." }, { status: 400 });
  }

  // Sadece doğru olan 5 parametre ile fonksiyonu çağırıyoruz
  const { data, error } = await supabaseAdmin.rpc("create_new_subscription", {
    p_student_id: student_id,
    p_package_id: package_id,
    p_payment_method: method || "havale_eft",
    p_note: note || null,
    p_start_date: start_date || null
  });

  if (error) {
    console.error("Create subscription RPC error:", error);
    return NextResponse.json({ error: `Veritabanı hatası: ${error.message}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, new_student_package_id: data });
}