// app/api/admin/applications/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function PATCH(req: Request) {
  // auth
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // body
  let id: string | undefined;
  let status: "pending" | "approved" | "rejected" | undefined;
  try {
    const body = await req.json();
    id = body?.id;
    status = body?.status;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }
  const allowed = new Set(["pending", "approved", "rejected"]);
  if (!status || !allowed.has(status)) {
    return NextResponse.json({ error: "status geçersiz" }, { status: 400 });
  }

  // update
  const { data, error } = await supabaseAdmin
    .from("basvurular")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("UPDATE basvurular error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data, success: true });
}
