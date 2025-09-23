// app/admin/(protected)/settings/page.tsx
"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Çıkış yapılamadı");
      }
      // login sayfana yönlendir (gerekirse değiştir)
      window.location.href = "/admin/login";
    } catch (e: any) {
      setErr(e?.message || "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-700">Hesap ve oturum işlemleri.</p>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Oturum</h2>
        <p className="mb-4 text-sm text-gray-700">
          Bu cihazdaki yönetici oturumunu kapatırsın.
        </p>
        <button
          onClick={logout}
          disabled={busy}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Çıkış yapılıyor…" : "Çıkış Yap"}
        </button>
      </div>
    </div>
  );
}
