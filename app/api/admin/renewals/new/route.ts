// app/api/admin/renewals/new/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { student_id, paket_id, baslangic_tarihi, alis_fiyati, hafta_sayisi } = body;

    if (!student_id) return NextResponse.json({ error: "student_id zorunlu" }, { status: 400 });

    const insertPayload: any = {
      ogrenci_id: student_id,
      paket_id: paket_id ?? null,
    };
    if (baslangic_tarihi) insertPayload.baslangic_tarihi = baslangic_tarihi;
    if (alis_fiyati != null) insertPayload.alis_fiyati = alis_fiyati;
    if (hafta_sayisi != null) insertPayload.hafta_sayisi = hafta_sayisi;

    const { data, error } = await supabase
      .from("ogrenci_paketleri")
      .insert(insertPayload)
      .select("id, ogrenci_id, paket_id, baslangic_tarihi, hafta_sayisi")
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Hata" }, { status: 500 });
  }
}