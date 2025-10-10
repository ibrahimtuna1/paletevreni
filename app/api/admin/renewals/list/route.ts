// app/api/admin/renewals/list/route.ts
import { NextResponse } from "next/server";
// DÜZELTME: Doğru client'ı, doğru dosyadan import ediyoruz.
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET() {
  try {
    // DÜZELTME: getSupabase() fonksiyonunu çağırmak yerine doğrudan import ettiğimiz client'ı kullanıyoruz.
    const { data, error } = await supabaseAdmin
      .from("v_yaklasan_yenilemeler") // Bu view'ın adının doğru olduğunu varsayıyorum
      .select("*");

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Saat farkı sorunlarını önlemek için saati sıfırla

    const items = (data || []).map((x: any) => {
      const end = x.bitis_tarihi as string | null;
      let bucket: "upcoming" | "expired" | "active" = "active";
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);
        const diff = (endDate.getTime() - today.getTime()) / 86400000;
        bucket = diff < 0 ? "expired" : diff <= 7 ? "upcoming" : "active";
      }
      return {
        student_id: x.ogrenci_id,
        student_name: x.ogrenci_adi,
        parent_name: x.veli_adi,
        parent_phone_e164: x.veli_tel,
        package_title: x.paket_adi,
        start_date: x.baslangic_tarihi,
        period_end: x.bitis_tarihi,
        bucket,
        student_package_id: x.ogrenci_paketi_id,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Hata" }, { status: 500 });
  }
}