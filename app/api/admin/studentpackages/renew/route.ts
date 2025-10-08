// app/api/admin/studentpackages/renew/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// küçük yardımcılar
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDaysStr(ymd: string, days: number) { const d = new Date(ymd); d.setDate(d.getDate() + days); return toYMD(d); }

export async function POST(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { student_id, package_id, method, note, preview } = body || {};
  if (!student_id || !package_id) {
    return NextResponse.json({ error: "student_id ve package_id zorunlu" }, { status: 400 });
  }

  // 1) Seçilen paketin meta bilgisi
  const { data: pack, error: perr } = await supabaseAdmin
    .from("packages")
    .select("valid_weeks, total_price, total_sessions")
    .eq("id", package_id)
    .maybeSingle();

  if (perr || !pack) {
    return NextResponse.json({ error: perr?.message || "Paket bulunamadı" }, { status: 400 });
  }

  const weeks = (pack as any).valid_weeks as number | null;               // 1 ay=4, 3 ay=12, 6 ay=24
  const price = (pack as any).total_price;                                // "1500.00"
  const totalSessions = (pack as any).total_sessions as number | null;    // 4/12/24
  if (typeof weeks !== "number") {
    return NextResponse.json({ error: "Paket valid_weeks tanımlı değil" }, { status: 400 });
  }

  // 2) Öğrencinin aktif kaydı var mı? (tek satır politikası)
  const { data: current, error: currErr } = await supabaseAdmin
    .from("student_packages")
    .select("id, package_id, start_date, status, sessions_total, sessions_used")
    .eq("student_id", student_id)
    .eq("status", "active")
    .maybeSingle();

  if (currErr && currErr.code !== "PGRST116") { // not found harici
    return NextResponse.json({ error: currErr.message }, { status: 400 });
  }

  // 3) Yeni dönem tarihlerini hesapla (kural: son dersten +1 hafta sonrası yeni ilk ders)
  let new_start: string;
  let new_end: string;
  let last_end_used: string | null = null;

  if (current && current.start_date) {
    // mevcut dönemin son dersini, mevcut paketin haftasına göre hesapla
    let oldWeeks = weeks;
    if (current.package_id && current.package_id !== package_id) {
      const { data: oldPack } = await supabaseAdmin
        .from("packages")
        .select("valid_weeks")
        .eq("id", current.package_id)
        .maybeSingle();
      if (oldPack && typeof (oldPack as any).valid_weeks === "number") {
        oldWeeks = (oldPack as any).valid_weeks;
      }
    }
    const last_end = addDaysStr(current.start_date as string, (oldWeeks - 1) * 7);
    last_end_used = last_end;
    new_start = addDaysStr(last_end, 7);                 // son dersten 1 hafta sonrası
  } else {
    // hiç aktif yoksa: önizleme geldiyse onu kullan; yoksa bugünün tarihi
    new_start = preview?.period_start || toYMD(new Date());
  }

  new_end = addDaysStr(new_start, (weeks - 1) * 7);

  // 4) UPDATE STRATEJİSİ:
  //    - Aktif kayıt varsa: aynı satırı GÜNCELLE (status='active' kalır; check constraint'e takılmayız)
  //    - Hiç kayıt yoksa: ilk kez INSERT et
  if (current && current.id) {
    const updatePayload: any = {
      package_id,
      price_at_purchase: price,
      sessions_total: (typeof totalSessions === "number" ? totalSessions : weeks),
      sessions_used: 0,
      start_date: new_start,
      // ileride eklemek istersen: renew_count=renew_count+1, last_end_date=last_end_used
    };

    const { error: uerr } = await supabaseAdmin
      .from("student_packages")
      .update(updatePayload)
      .eq("id", current.id);

    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 400 });

    // (opsiyonel) payments tablosuna kayıt atılacaksa burada method/note ile ekle
    // await supabaseAdmin.from("payments").insert({ student_package_id: current.id, amount: Number(price), method, status: "paid", paid_at: new Date().toISOString(), note: note || null });

    return NextResponse.json({
      id: current.id,
      period_start: new_start,
      period_end: new_end,
      price,
      sessions_total: updatePayload.sessions_total,
      last_period_end: last_end_used,
      mode: "updated"
    });
  } else {
    const insertPayload = {
      student_id,
      package_id,
      status: "active" as const,
      price_at_purchase: price,
      sessions_total: (typeof totalSessions === "number" ? totalSessions : weeks),
      sessions_used: 0,
      start_date: new_start,
    };

    const { data: created, error: cerr } = await supabaseAdmin
      .from("student_packages")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (cerr || !created) {
      return NextResponse.json({ error: cerr?.message || "Yeni kayıt oluşturulamadı" }, { status: 400 });
    }

    // (opsiyonel) payments kaydı
    // await supabaseAdmin.from("payments").insert({ student_package_id: created.id, amount: Number(price), method, status: "paid", paid_at: new Date().toISOString(), note: note || null });

    return NextResponse.json({
      id: created.id,
      period_start: new_start,
      period_end: new_end,
      price,
      sessions_total: insertPayload.sessions_total,
      last_period_end: last_end_used,
      mode: "inserted"
    });
  }
}