"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative text-white">
      {/* BG görsel + overlay */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/images/footer-bg.png"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/60 to-black/70" />
      </div>

      {/* ==== FULL-BLEED İÇERİK (kenarlarda boşluk yok) ==== */}
      <div className="relative w-full py-6 lg:py-8">
        {/* Satır 1: Logo - Nav - Sosyal */}
        <div className="grid w-full items-center gap-4 md:grid-cols-[auto,1fr,auto]">
          {/* Logo */}
          <div className="flex items-center justify-self-start">
            <Link href="/" className="inline-flex items-center shrink-0" aria-label="Palet Evreni anasayfa">
              <Image
                src="/images/logo.png"
                alt="Palet Evreni"
                width={200}
                height={52}
                priority
                className="w-56 md:w-64 h-auto"
              />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex justify-center gap-4 text-[13px] font-medium">
            <a href="#programlar" className="text-white/85 hover:text-white">PAKETLERİMİZ</a>
            <a href="#nasil" className="text-white/85 hover:text-white">HAKKIMIZDA</a>
            <a href="#sss" className="text-white/85 hover:text-white">SSS</a>
            <Link href="/auth" className="text-fuchsia-300 hover:text-white underline underline-offset-4">
              HEMEN BAŞVUR!
            </Link>
          </nav>

          {/* Sosyal */}
          <div className="flex items-center justify-self-end">
            <FollowUs compact />
          </div>
        </div>

        {/* Satır 2 */}
        <div className="mt-6 w-full border-t border-white/15 pt-6 md:flex md:items-center md:justify-between">
          <p className="hidden max-w-xl text-xs text-white/80 md:block">
            Canlı online resim dersi, ödev geri bildirimi ve portfolyo koçluğu. Yaratıcılığını evinden büyüt.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a href="tel:05015303949" className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 hover:bg-black/30">
              📞 0501 530 39 49
            </a>
            <a href="mailto:info@paletevreni.com" className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 hover:bg-black/30">
              ✉️ info@paletevreni.com
            </a>
            <button
              onClick={scrollTop}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-white/85 hover:bg-black/30"
              aria-label="Yukarı çık"
            >
              ↑ Yukarı
            </button>
          </div>
        </div>

        {/* Alt satır */}
        <div className="mt-4 flex w-full flex-col items-center justify-between gap-2 border-t border-white/15 pt-4 text-xs text-white/70 md:flex-row">
          <p>© {year} Palet Evreni. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-2">
            <a className="hover:text-white" href="#">Kullanım Şartları</a>
            <span>·</span>
            <a className="hover:text-white" href="#">Gizlilik</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* --- Sosyal Bar --- */
function FollowUs({ compact = false }: { compact?: boolean }) {
  const iconClass = compact ? "h-4 w-4" : "h-5 w-5";
  const gap = compact ? "gap-2" : "gap-3";
  const labelClass = compact ? "text-[12px]" : "text-sm";

  return (
    <div className={`flex items-center ${gap}`}>
      <span className={`${labelClass} text-white/75`}>Bizi Takip Edin</span>
      <Social href="https://facebook.com" label="Facebook">
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.1V12h2.1V9.8c0-2.2 1.3-3.6 3.6-3.6 1 0 2 .1 3 .2v2.5h-1.7c-1.3 0-1.6.6-1.6 1.5V12h3.1l-.5 2.9h-2.6v7A10 10 0 0 0 22 12z" />
        </svg>
      </Social>
      <Social href="https://x.com" label="X">
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
          <path d="M3 3h4.8l4.1 5.9L16.7 3H21l-6.7 8.7L21 21h-4.8l-4.4-6.3L7.3 21H3l7-9.2z" />
        </svg>
      </Social>
      <Social href="https://instagram.com" label="Instagram">
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      </Social>
      <Social href="https://youtube.com" label="YouTube">
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4 .6 9.4 .6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.8 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      </Social>
    </div>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center p-1.5 text-white transition-opacity hover:opacity-85"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
