import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

function toE164TR(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  const last10 = d.slice(-10);
  return last10.length === 10 ? `+90${last10}` : `+${d}`;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const { student_name, parent_name, parent_phone, age, class_id } = b as {
    student_name?: string; parent_name?: string; parent_phone?: string;
    age?: number | null; class_id?: string | null;
  };

  if (!student_name || !parent_name || !parent_phone) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
  }

  const phoneE164 = toE164TR(parent_phone);

  const { data, error } = await supabaseAdmin
    .from("students")
    .insert([{
      student_name,
      parent_name,
      parent_phone_e164: phoneE164,
      age: age ?? null,
      status: "active",
      admin_note: null,
      class_id: class_id ?? null,
    }])
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ id: data?.id });
}
