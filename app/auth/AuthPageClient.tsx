// app/auth/AuthPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase/client";

type Role = "ogrenci" | "ogretmen";
type Tab = "giris" | "kayit";

export default function AuthPageClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const defaultTab = (sp.get("tab") as Tab) || "giris";
  const defaultRole = (sp.get("role") as Role) || "ogrenci";
  const plan = sp.get("plan");

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [role, setRole] = useState<Role>(defaultRole);

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = tab === "giris";

  const title = useMemo(
    () => (isLogin ? "Paneline Giriş Yap" : "Yeni Hesap Oluştur"),
    [isLogin]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Giriş başarılı → yönlendir
        router.push("/"); // hazırsa /dashboard yapabilirsin
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role } },
        });
        if (error) throw error;
        alert("Kayıt tamam. E-postanı doğrula, sonra giriş yapabilirsin.");
        setTab("giris");
      }
    } catch (err: any) {
      alert(err?.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* KOYU pembe→mor arka plan + doku */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900 via-fuchsia-950 to-purple-950" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)] [background-size:18px_18px]" />
      <div className="absolute inset-0 mix-blend-screen">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Palet Evreni</h1>
          <p className="mt-2 text-sm text-white/70">
            {isLogin ? "Hesabınla devam et." : "Hızlıca yeni hesap oluştur."}
          </p>
          {plan === "trial" && (
            <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/85">
              Deneme paketiyle başlayacaksın. Kayıt sonrası e-postanı kontrol et.
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
          {/* Sekmeler + Rol seçici */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(["giris", "kayit"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    tab === t ? "bg-white/25 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {t === "giris" ? "Giriş" : "Kayıt"}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(["ogrenci", "ogretmen"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    role === r ? "bg-white/25 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {r === "ogrenci" ? "Öğrenci" : "Öğretmen"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-lg font-semibold text-white">
                  {isLogin ? "Paneline Giriş Yap" : "Yeni Hesap Oluştur"}
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  {role === "ogrenci"
                    ? "Öğrenci paneliyle canlı derse katıl, ödev yükle ve geri bildirim al."
                    : "Öğretmen paneliyle sınıflarını yönet, içerik planla, portfolyoları değerlendir."}
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
                  <li>Canlı ders erişimi ve kayıtlar</li>
                  <li>Ödev & portfolyo değerlendirmesi</li>
                  <li>Bildirimler ve takvim entegrasyonu</li>
                </ul>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-5">
                {tab === "kayit" && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm text-white/80">Ad Soyad</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-fuchsia-400/60"
                      placeholder="Örn. Elif Yılmaz"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-1 block text-sm text-white/80">
                    {role === "ogrenci" ? "Öğrenci E-posta" : "Öğretmen E-posta"}
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-fuchsia-400/60"
                    placeholder="ornek@paletevreni.com"
                  />
                </div>

                <div className="mb-2">
                  <label className="mb-1 block text-sm text-white/80">Şifre</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-fuchsia-400/60"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  disabled={loading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 font-semibold text-black shadow-lg shadow-fuchsia-500/20 disabled:opacity-70"
                >
                  {loading ? "İşleniyor..." : isLogin ? "Giriş Yap" : "Kayıt Ol"}
                </button>

                <p className="mt-3 text-center text-xs text-white/60">
                  {isLogin ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
                  <button
                    type="button"
                    onClick={() => setTab(isLogin ? "kayit" : "giris")}
                    className="text-fuchsia-200 underline underline-offset-4"
                  >
                    {isLogin ? "Kayıt ol" : "Giriş yap"}
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-3xl text-center text-xs text-white/60">
          Devam ederek <span className="underline">Kullanım Şartları</span> ve{" "}
          <span className="underline">Gizlilik Politikası</span>’nı kabul etmiş olursun.
        </div>
      </div>
    </section>
  );
}
