// app/api/admin/packages/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickDisplayName(x: any) {
  return (
    x.title ??
    x.display_name ??
    x.name ??
    x.package_name ??
    x.label ??
    x.code ??
    x.slug ??
    `Paket #${String(x.id ?? "").slice(0, 6)}`
  );
}

function pickDurationDays(x: any) {
  if (typeof x.duration_days === "number") return x.duration_days;
  if (typeof x.duration_in_days === "number") return x.duration_in_days;
  if (typeof x.days === "number") return x.days;
  if (typeof x.valid_weeks === "number") return x.valid_weeks * 7; // <- your schema
  if (typeof x.weeks === "number") return x.weeks * 7;
  if (typeof x.months === "number") return x.months * 30;
  if (typeof x.duration === "number") return x.duration; // bazı şemalar böyle
  return null;
}

function pickPrice(x: any) {
  // Supabase numeric/text gelebilir → güvenli number
  const p = x.total_price ?? x.price ?? null;
  if (p === null || p === undefined) return null;
  const n = typeof p === "number" ? p : Number(p);
  return Number.isFinite(n) ? n : null;
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
    // total_price numeric ise doğru; text ise yine de çalışır ama sıralama lexicographic olabilir.
    .order("total_price", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // normalize et
  let items = (data ?? []).map((x: any) => {
    const duration_days = pickDurationDays(x);
    const duration_weeks = typeof x.valid_weeks === "number"
      ? x.valid_weeks
      : (typeof duration_days === "number" ? Math.round(duration_days / 7) : null);
    const duration_months = typeof duration_weeks === "number"
      ? Math.round(duration_weeks / 4)
      : (typeof x.months === "number" ? x.months : null);

    return {
      id: x.id,
      code: x.code ?? null,
      title: x.title ?? null,
      display_name: pickDisplayName(x),
      duration_days,
      duration_weeks,
      duration_months,
      total_sessions: x.total_sessions ?? null,
      // price fields
      total_price: pickPrice(x),                         // numeric for UI calculations
      total_price_raw: x.total_price?.toString() ?? null, // original as text (for display/debug)
      price: pickPrice(x),                               // alias for backward-compat
      is_active: x.is_active ?? true,
      created_at: x.created_at ?? null,
      raw: x,
    };
  });

  // güvenli arama (DB kolon adı değişse de kırılmaz)
  if (q) {
    items = items.filter((r) => {
      const hay = [
        r.display_name || "",
        r.code || "",
        r.title || "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }

  return NextResponse.json({ items });
}
