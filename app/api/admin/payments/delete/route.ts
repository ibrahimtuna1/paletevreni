import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function DELETE(req: Request) {
  try {
    // Admin yetki kontrolü
    // const { cookies } = await import("next/headers");
    // if (cookies().get("admin_session")?.value !== "admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = await req.json().catch(() => ({}));
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId gerekli" }, { status: 400 });
    }

    // Veritabanı fonksiyonunu çağırarak güvenli silme işlemini yap
    const { error } = await supabaseAdmin.rpc("delete_payment_and_package", {
      p_payment_id: paymentId,
    });

    if (error) {
      console.error("Delete payment RPC error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}