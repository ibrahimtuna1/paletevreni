import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const cookieStore = cookies();
  if ((await cookieStore).get("admin_session")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const student_id = searchParams.get("student_id");
  if (!student_id) return NextResponse.json({ error: "student_id zorunlu" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("student_packages")
    .select("package_id,status")
    .eq("student_id", student_id)
    .in("status", ["active", "paused"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    package_ids: (data ?? []).map((r: any) => r.package_id),
  });
}
