// app/api/admin/payments/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(req: Request) {
  // auth
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // id hem body'den hem query'den gelebilir
  let id: string | null = null;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = await req.json();
      if (body && typeof body.id === "string") id = body.id;
    } catch {
      /* body yok/bozuk olabilir, query'e düşer */
    }
  }
  if (!id) {
    const { searchParams } = new URL(req.url);
    id = searchParams.get("id");
  }

  if (!id) {
    return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
  }

  // sil
  const { error } = await supabaseAdmin.from("payments").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
