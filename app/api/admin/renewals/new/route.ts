// app/api/admin/renewals/new/route.ts

import { NextResponse } from "next/server";
// DÜZELTME: Kendi client'ımızı oluşturmak yerine, merkezi admin client'ını import ediyoruz.
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Frontend'den gelen parametreleri alıyoruz
    const { student_id, package_id, start_date, method, note } = body;

    if (!student_id || !package_id) {
      return NextResponse.json({ error: "Öğrenci ve paket seçimi zorunludur." }, { status: 400 });
    }
    
    // DÜZELTME: Doğrudan INSERT yapmak yerine, tüm işi yapan RPC fonksiyonumuzu çağırıyoruz.
    // Bu fonksiyon bitiş tarihini doğru hesaplar ve ödeme kaydını otomatik oluşturur.
    const { data, error } = await supabaseAdmin.rpc("create_new_subscription", {
      p_student_id: student_id,
      p_package_id: package_id,
      p_payment_method: method || 'havale_eft', // Varsayılan bir metot belirleyelim
      p_note: note || 'Elle yenileme ekranından oluşturuldu.', // Bir not ekleyelim
      p_start_date: start_date || null // Opsiyonel başlangıç tarihi
    });

    if (error) {
        console.error("RPC error from renewals/new:", error);
        throw new Error(error.message);
    }
    
    // Frontend'e yeni oluşturulan paket kaydının ID'sini dönebiliriz.
    return NextResponse.json({ item: { id: data } });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Hata" }, { status: 500 });
  }
}