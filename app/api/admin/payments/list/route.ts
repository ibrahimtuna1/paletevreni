import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Frontend'den gelen tüm filtreleri al
  const params = {
    q: searchParams.get("q") || null,
    status: searchParams.get("status") || null,
    method: searchParams.get("method") || null,
    student_package_id: searchParams.get("studentPackageId") || null,
    date_from: searchParams.get("date_from") || null,
    date_to: searchParams.get("date_to") || null,
    page_num: parseInt(searchParams.get("page") || "1"),
    page_size: parseInt(searchParams.get("pageSize") || "25"),
  };

  try {
    const { data, error } = await supabaseAdmin.rpc("get_filtered_payments", params);

    if (error) {
      console.error("Get filtered payments RPC error:", error);
      throw new Error(error.message);
    }
    
    // Fonksiyon zaten bize 'items', 'summary' ve 'total' içeren bir JSON döndürüyor.
    // Frontend'in beklediği formatta yeniden yapılandıralım.
    const responseData = {
      items: data.items,
      total: data.summary.total,
      summary: {
        totalRevenue: data.summary.totalRevenue,
        countByStatus: data.summary.countByStatus,
        methodBreakdown: data.summary.methodBreakdown,
      },
    };

    return NextResponse.json(responseData);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}