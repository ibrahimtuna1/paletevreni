import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const { data: studs, error: sErr } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("class_id", id);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
  if ((studs ?? []).length > 0) {
    return NextResponse.json(
      { error: "Bu sınıfta öğrenci var. Önce öğrencileri başka sınıfa alın veya sınıfı boşaltın." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
