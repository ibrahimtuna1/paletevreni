import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Frontend'den gelen doğru alan adlarını kullanıyoruz: 'firstLessonDate'
  const { trialId, packageId, paidAmount, firstLessonDate, method } = body;

  if (!trialId || !packageId || !firstLessonDate) {
    return NextResponse.json({ error: "trialId, packageId ve firstLessonDate gerekli" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("promote_trial_to_student_with_package", {
      p_trial_id: trialId,
      p_package_id: packageId,
      p_paid_amount: Number(paidAmount || 0),
      // Veritabanına doğru parametre adıyla gönderiyoruz: 'p_first_lesson_date'
      p_first_lesson_date: firstLessonDate, 
      p_method: method || "havale_eft",
      p_admin: "panel"
    });

    if (error) {
      console.error("Promote trial student RPC error:", error);
      return NextResponse.json({ error: `Veritabanı hatası: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, new_student_id: data });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}