import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

type Body = { id?: string; note?: string };

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("tanitim_dersi_ogrencileri")
    .update({ admin_note: body?.note ?? null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
