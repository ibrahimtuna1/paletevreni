// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/signin hariç koru
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/signin")) {
    const token = req.cookies.get("admin_session")?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/signin";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
