// app/lib/adminSessionsEdge.ts
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const SECRET = process.env.ADMIN_JWT_SECRET || "default-secret";
const TTL_SECONDS = 12 * 60 * 60; // 12h

// --- küçük yardımcılar ---
const enc = new TextEncoder();
function toB64Url(bytes: Uint8Array) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64Url(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey() {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// --- token: base64url(payloadJSON) + "." + base64url(HMAC) ---
export async function signAdminToken(adminId: string, email: string) {
  const payload = {
    sub: adminId,
    email,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payloadJson = JSON.stringify(payload);
  const key = await importKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadJson));
  const token = `${toB64Url(enc.encode(payloadJson))}.${toB64Url(new Uint8Array(sigBuf))}`;
  return token;
}

export async function verifyAdminToken(token: string) {
  try {
    const [p, s] = token.split(".");
    if (!p || !s) return null;
    const payloadBytes = fromB64Url(p);
    const sigBytes = fromB64Url(s);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const key = await importKey();
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadJson));
    if (!ok) return null;
    const payload = JSON.parse(payloadJson) as { sub: string; email: string; exp: number };
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
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
    secure: process.env.NODE_ENV === "production", // localde yaz
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set({ name: COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
}
