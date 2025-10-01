// app/api/admin/applications/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";

async function handler(req: Request) {
  try {
    // ---- Auth ----
    const role = (await cookies()).get("admin_session")?.value; // TS susar
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- id al (query -> json -> form) ----
    const url = new URL(req.url);
    let id = url.searchParams.get("id")?.trim() || undefined;

    if (!id) {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await req.json().catch(() => ({} as any));
        if (typeof body?.id === "string") id = body.id.trim();
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const form = await req.formData().catch(() => null);
        const v = form?.get("id");
        if (typeof v === "string") id = v.trim();
      }
    }
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    // ---- Hard delete dene ----
    const { data, error } = await supabaseAdmin
      .from("applications")
      .delete()
      .eq("id", id)
      .select("id");

    if (!error && data && data.length > 0) {
      return NextResponse.json({ ok: true, id: data[0].id, hardDeleted: true });
    }

    // ---- Hata ayıkla ----
    const code = (error as any)?.code || (error as any)?.details || "unknown";
    const msg = (error as any)?.message || String(error);

    // a) UUID format hatası
    if (code === "22P02" || /invalid input syntax.*uuid/i.test(msg)) {
      return NextResponse.json({ error: "Geçersiz id formatı", code }, { status: 400 });
    }

    // b) FK violation -> soft delete
    if (
      code === "23503" ||
      /foreign key|violates foreign key/i.test(msg)
    ) {
      const { data: sData, error: sErr } = await supabaseAdmin
        .from("applications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null) // zaten soft silindiyse dokunma
        .select("id")
        .single();

      if (sErr) {
        return NextResponse.json(
          { error: sErr.message || "Soft delete başarısız", code: (sErr as any)?.code || "unknown" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, id: sData.id, softDeleted: true });
    }

    // c) başka DB hatası
    return NextResponse.json({ error: msg, code }, { status: 400 });
  } catch (err: any) {
    console.error("applications/delete error:", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu" }, { status: 500 });
  }
}

export { handler as DELETE, handler as POST };
