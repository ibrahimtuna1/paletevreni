import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE = "admin_session";

// Env'den secret al, yoksa fallback ver (local için)
const SECRET = process.env.ADMIN_JWT_SECRET || "default-secret";

type Payload = { sub: string; email: string };

export function signAdminJwt(adminId: string, email: string) {
  return jwt.sign({ sub: adminId, email }, SECRET, {
    expiresIn: "12h",
  });
}

export function verifyAdminJwt(token: string) {
  try {
    return jwt.verify(token, SECRET) as Payload;
  } catch (e) {
    console.error("❌ JWT verify error:", e);
    return null;
  }
}

export async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // localde yazılabilsin
    path: "/",
    maxAge: 60 * 60 * 12, // 12 saat
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set({
    name: COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
