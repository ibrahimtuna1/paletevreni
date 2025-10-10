// app/api/admin/renewals/student-status-list/route.ts

import { NextResponse } from "next/server";
// İstemciyi artık merkezi dosyadan import ediyoruz
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  try {
    // Veritabanı sorgusunu 'supabaseAdmin' istemcisi ile yapıyoruz
    const { data, error } = await supabaseAdmin
      .from("v_student_package_status") // Veritabanı view'ının adını kontrol etmeyi unutma
      .select(`
        id,
        student_name,
        parent_name,
        parent_phone_e164,
        student_package_id,
        package_title,
        start_date,
        period_end
      `);

    if (error) {
      console.error("Supabase view query error:", error);
      throw new Error(error.message);
    }

    // Frontend'in beklediği formatta veriyi dönüyoruz.
    return NextResponse.json({ items: data });

  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal Server Error: " + e.message },
      { status: 500 }
    );
  }
}