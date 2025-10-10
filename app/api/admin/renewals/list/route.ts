// app/api/admin/renewals/list/route.ts
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server"; // <-- ENV yok

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("v_yaklasan_yenilemeler")
      .select("*");

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const items = (data || []).map((x: any) => {
      const end = x.bitis_tarihi as string | null;
      let bucket: "upcoming" | "expired" | "active" = "active";
      if (end) {
        const diff =
          (new Date(end + "T00:00:00").getTime() -
            new Date(today + "T00:00:00").getTime()) /
          86400000;
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