import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET(req: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from("v_student_financial_summary")
      .select("*")
      .order("student_name", { ascending: true }); // Öğrencileri isme göre sırala

    if (error) {
      console.error("Student financial summary error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ items: data });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}