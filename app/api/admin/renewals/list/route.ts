import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabaseServer";
export const revalidate = 0;

const toYMD=(d:Date)=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
const addDays=(ymd:string,days:number)=>{const d=new Date(ymd+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return toYMD(d);};

export async function GET(req: NextRequest) {
  const supabase = serverSupabase();
  const now = new Date(); const today = toYMD(now);

  // aktif paketler + öğrenci + paket
  const { data, error } = await supabase
    .from("student_packages")
    .select(`
      id, student_id, start_date, status, sessions_total, price_at_purchase,
      student:students ( id, student_name, parent_name, parent_phone_e164 ),
      package:packages ( id, title, valid_weeks, total_sessions )
    `)
    .eq("status", "active")
    .order("start_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data||[]).map((row:any) => {
    const weeks = row.package?.valid_weeks ?? row.package?.total_sessions ?? row.sessions_total ?? 4;
    const period_end = row.start_date ? addDays(row.start_date, Math.max(0, weeks*7 - 1)) : null;

    let bucket: "expired"|"upcoming"|"active" = "active";
    if (period_end) {
      const diff = (new Date(period_end).getTime() - new Date(today).getTime()) / 86400000;
      if (diff < 0) bucket = "expired";
      else if (diff <= 7) bucket = "upcoming";
      else bucket = "active";
    }

    return {
      student_package_id: row.id,
      student_id: row.student?.id,
      student_name: row.student?.student_name,
      parent_name: row.student?.parent_name,
      parent_phone_e164: row.student?.parent_phone_e164,
      package_title: row.package?.title,
      start_date: row.start_date,
      period_end,
      bucket,
      amount: Number(row.price_at_purchase || 0),
    };
  });

  return NextResponse.json({ items });
}