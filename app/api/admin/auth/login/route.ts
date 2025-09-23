import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// client: password check
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// server-only: rol okuma güvenli olsun
import { createClient as createServerClient } from "@supabase/supabase-js";
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // .env'ine ekle
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1) Şifre doğrulama
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error("🔴 Supabase login error:", error?.message, error); // LOG
      return NextResponse.json({ error: "E-posta ya da şifre hatalı." }, { status: 401 });
    }

    // 2) Rol kontrolü
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (pErr) {
      console.error("🔴 Supabase profile error:", pErr.message, pErr); // LOG
      return NextResponse.json({ error: "Rol okunamadı." }, { status: 500 });
    }

    if (!profile?.role) {
      console.warn("⚠️ Kullanıcıda rol yok:", data.user.id, email); // LOG
      return NextResponse.json({ error: "Bu hesaba rol atanmadı." }, { status: 403 });
    }

    // 3) Cookie yaz
    const res = NextResponse.json({ ok: true, role: profile.role });
    res.cookies.set("admin_session", profile.role, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30, // 30 dk
    });
    console.log("✅ Login başarılı:", email, "rol:", profile.role); // LOG
    return res;
  } catch (e: any) {
    console.error("🔥 Sunucu hatası:", e.message || e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
