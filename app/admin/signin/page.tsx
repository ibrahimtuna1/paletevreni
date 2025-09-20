"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminSignin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success" | null>(null);

  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/admin";

  async function login() {
    setLoading(true);
    setMsg(null);
    setMsgType(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // tip güvenliği: sadece error alanını bekliyoruz
      const data = (await res.json()) as { error?: string } | unknown;

      if (!res.ok) {
        const errMsg =
          typeof data === "object" && data && "error" in (data as Record<string, unknown>)
            ? String((data as { error?: string }).error || "Giriş başarısız.")
            : "Giriş başarısız.";
        setMsg(errMsg);
        setMsgType("error");
        return;
      }

      setMsg("Giriş başarılı! Yönlendiriliyorsunuz...");
      setMsgType("success");
      setTimeout(() => router.push(nextUrl), 1000);
    } catch (err: unknown) {
      // err'u kullanıyoruz ki no-unused-vars uyarısı olmasın, ayrıca log almış oluruz
      console.error(err);
      setMsg("Bir hata oluştu.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100vh] flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-6 shadow-md bg-white">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Admin Panel Girişi</h1>
        <p className="mb-6 text-sm text-gray-600">E-posta ve şifrenle giriş yap.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-800 mb-1">E-posta</label>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-black focus:ring focus:ring-black/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@paletevreni.com"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800 mb-1">Şifre</label>
          <input
            type="password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-black focus:ring focus:ring-black/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          disabled={loading || !email || !password}
          onClick={login}
          className="w-full rounded-md bg-black px-4 py-2 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        {msg && (
          <p className={`mt-4 text-sm ${msgType === "error" ? "text-red-600" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
