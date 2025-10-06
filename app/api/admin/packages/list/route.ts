// app/api/admin/packages/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickDisplayName(x: any) {
  return (
    x.display_name ??
    x.name ??
    x.title ??
    x.package_name ??
    x.label ??
    x.slug ??
    `Paket #${String(x.id ?? "").slice(0, 6)}`
  );
}

function pickDurationDays(x: any) {
  if (typeof x.duration_days === "number") return x.duration_days;
  if (typeof x.duration === "number") return x.duration;          // bazı şemalar böyle
  if (typeof x.days === "number") return x.days;
  if (typeof x.weeks === "number") return x.weeks * 7;
  if (typeof x.months === "number") return x.months * 30;
  if (typeof x.duration_in_days === "number") return x.duration_in_days;
  return null;
}

export async function GET(req: Request) {
  const cookieStore = cookies(); // await yok
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLocaleLowerCase("tr");

  // DB'den ham veriyi çek
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("*")
    .eq("is_active", true)
    // total_price yoksa burada hata alırsın; emin değilsen bu satırı kaldır.
    .order("total_price", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // normalize et
  let items = (data ?? []).map((x: any) => ({
    id: x.id,
    display_name: pickDisplayName(x),
    duration_days: pickDurationDays(x),
    price: x.total_price ?? x.price ?? null,
    is_active: x.is_active ?? true,
    // istersen diğer ham alanları da taşı:
    raw: x,
  }));

  // güvenli arama (DB kolon adı değişse de kırılmaz)
  if (q) {
    items = items.filter((r) =>
      (r.display_name || "").toLocaleLowerCase("tr").includes(q)
    );
  }

  return NextResponse.json({ items });
}
