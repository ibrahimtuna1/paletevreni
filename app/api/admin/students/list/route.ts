import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // URL'den gelen filtre parametrelerini alıyoruz
  const q = (searchParams.get("q") || "").trim();
  const classId = searchParams.get("classId"); // YENİ EKLENEN SATIR

  try {
    let query = supabaseAdmin
      .from("students")
      .select(`
        id,
        student_name,
        parent_name,
        parent_phone_e164,
        status,         
        created_at,     
        class_id,       
        classes ( name )
      `)
      .order("student_name", { ascending: true });

    // Arama filtresini uygula
    if (q) {
      query = query.or(
        `student_name.ilike.%${q}%,parent_name.ilike.%${q}%,parent_phone_e164.ilike.%${q}%`
      );
    }

    // YENİ EKLENEN BLOK: Eğer bir classId geldiyse, sadece o sınıftaki öğrencileri getir
    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: studentsData, error } = await query;

    if (error) {
      throw new Error(error.message);
    }
    
    const items = studentsData.map(student => {
      const classInfo = Array.isArray(student.classes) ? student.classes[0] : student.classes;
      const className = classInfo ? classInfo.name : null;

      return {
        id: student.id,
        student_name: student.student_name,
        parent_name: student.parent_name,
        parent_phone_e164: student.parent_phone_e164,
        status: student.status, 
        class_id: student.class_id,
        class_name: className, 
        created_at: student.created_at
      };
    });

    return NextResponse.json({ items });

  } catch (e: any) {
    console.error("Error fetching students list:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}