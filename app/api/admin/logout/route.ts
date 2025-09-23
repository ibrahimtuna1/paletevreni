// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // admin_session çerezini sil
  res.cookies.set({
    name: "admin_session",
    value: "",
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}

// İstersen GET ile de destekleyelim (link tıklaması için)
export async function GET() {
  const res = NextResponse.redirect(new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  res.cookies.set({
    name: "admin_session",
    value: "",
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
