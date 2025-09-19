// app/components/Footer.tsx
"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative mt-16 border-t border-white/10 bg-gradient-to-b from-[#0b0b18] via-[#0b0b18] to-black text-white">
      {/* üstte hafif parlama */}
      <div className="pointer-events-none absolute -top-6 left-1/2 h-12 w-[70%] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-2xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
        {/* Satır 1: Marka + kısa açıklama */}
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div>
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Palet<span className="text-fuchsia-400">Evreni</span>
            </Link>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Canlı online resim dersi, ödev geri bildirimi ve portfolyo
              koçluğu. Yaratıcılığını evinden büyüt.
            </p>
          </div>

          {/* Navigasyon */}
          <nav className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <a href="#programlar" className="text-white/80 hover:text-white">Programlar</a>
            <a href="#nasil" className="text-white/80 hover:text-white">Nasıl Çalışır?</a>
            <a href="#sss" className="text-white/80 hover:text-white">SSS</a>
            <Link href="/auth" className="text-white/80 hover:text-white">
              Giriş / Kayıt
            </Link>
          </nav>
        </div>

        {/* Satır 2: İletişim + Sosyal */}
        <div className="mt-8 flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href="tel:05015303949"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 hover:bg-white/10"
            >
              📞 0501 530 39 49
            </a>
            <a
              href="mailto:info@paletevreni.com"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 hover:bg-white/10"
            >
              ✉️ info@paletevreni.com
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Social href="https://instagram.com" label="Instagram">
              {/* Instagram icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3a5 5 0 110 10 5 5 0 010-10zm0 2.2A2.8 2.8 0 1014.8 12 2.8 2.8 0 0012 9.2zM17.8 6.2a1 1 0 11-1 1 1 1 0 011-1z" />
              </svg>
            </Social>
            <Social href="https://youtube.com" label="YouTube">
              {/* YouTube icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 00.5 6.2 31.7 31.7 0 000 12a31.7 31.7 0 00.5 5.8 3 3 0 002.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 002.1-2.1A31.7 31.7 0 0024 12a31.7 31.7 0 00-.5-5.8zM9.8 15.5v-7l6 3.5-6 3.5z" />
              </svg>
            </Social>
            <button
              onClick={scrollTop}
              className="ml-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20"
              aria-label="Yukarı çık"
            >
              ↑ Yukarı
            </button>
          </div>
        </div>

        {/* Alt satır */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/60 md:flex-row">
          <p>© {year} Palet Evreni. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-3">
            <a className="hover:text-white/80" href="#">Kullanım Şartları</a>
            <span>·</span>
            <a className="hover:text-white/80" href="#">Gizlilik</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
