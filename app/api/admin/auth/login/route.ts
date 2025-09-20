// app/api/admin/auth/login/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase/client";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, email, password")
      .eq("email", email)
      .single();

    if (error || !admin) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 });
    }
    if (admin.password !== password) {
      return NextResponse.json({ error: "Yanlış şifre" }, { status: 401 });
    }

    // DÜMDÜZ: admin_session=1 yaz, redirect et
    const res = NextResponse.redirect(new URL("/admin", req.url));
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 saat
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
