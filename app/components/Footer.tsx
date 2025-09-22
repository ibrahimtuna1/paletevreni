// app/components/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate text-white overflow-x-clip">
      {/* BG görsel + overlay + bloblar */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="relative h-full w-full">
          <Image
            src="/images/footer-bg.png"
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/70" />
          {/* soft blob parıltılar */}
          <div className="absolute -top-24 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-500/12 via-purple-500/10 to-sky-500/10 blur-3xl" />
          <div className="absolute -bottom-32 right-[10%] h-64 w-[48rem] rounded-full bg-gradient-to-tr from-pink-500/10 via-orange-400/10 to-emerald-500/10 blur-3xl" />
        </div>
      </div>

      {/* İçerik */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 pt-8">
        {/* 3 sütun */}
        <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">Kurumsal</h4>
            <ul className="mt-2 space-y-1.5 text-[15px] text-white/85">
              <li><a className="hover:text-white" href="#">Hakkımızda</a></li>
              <li><a className="hover:text-white" href="#">Paketlerimiz</a></li>
              <li><a className="hover:text-white" href="#">Eğitim Felsefemiz</a></li>
              <li><a className="hover:text-white" href="#">Yönetim Ekibimiz</a></li>
              <li><a className="hover:text-white" href="#">Haberler</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">Eğitim</h4>
            <ul className="mt-2 space-y-1.5 text-[15px] text-white/85">
              <li><a className="hover:text-white" href="#">Kişiye Özgü Öğretim Modeli</a></li>
              <li><a className="hover:text-white" href="#">Çift Dilli Eğitim</a></li>
              <li><a className="hover:text-white" href="#">Master 6</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">BİZİ TAKİP EDİN</h4>
            <ul className="mt-2 space-y-1.5 text-[15px] text-white/85">
              {/* Instagram */}
              <li>
                <a
                  href="https://www.instagram.com/palet.evreni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram - palet.evreni"
                  className="flex items-center justify-center gap-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
                >
                  <span>Instagram</span>
                  <IconInstagram />
                </a>
              </li>

              {/* Facebook */}
              <li>
                <a
                  href="https://www.facebook.com/people/Palet-Evreni/61581130957062/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook - Palet Evreni"
                  className="flex items-center justify-center gap-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
                >
                  <span>Facebook</span>
                  <IconFacebook />
                </a>
              </li>

              {/* TikTok (yeni) */}
              <li>
                <a
                  href="https://www.tiktok.com/@paletevreni"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok - paletevreni"
                  className="flex items-center justify-center gap-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
                >
                  <span>TikTok</span>
                  <IconTikTok />
                </a>
              </li>

              {/* Diğerleri (linkler hazır olunca ekleriz) */}
              <li className="flex items-center justify-center gap-2"><span>LinkedIn</span><IconLinkedIn /></li>
              <li className="flex items-center justify-center gap-2"><span>YouTube</span><IconYouTube /></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ALT BAR */}
      <div className="w-full">
        <div className="flex items-center justify-between py-1.5 pl-0 pr-[max(env(safe-area-inset-right),0.75rem)]">
          <Link href="/" aria-label="Palet Evreni" className="block">
            <Image
              src="/images/logo.png"
              alt="Palet Evreni"
              width={640}
              height={176}
              priority
              className="block h-auto w-[300px] sm:w-[360px] md:w-[420px] lg:w-[480px]"
            />
          </Link>

          <p className="text-[13px] sm:text-sm text-white/80">
            {year} © Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ikonlar */
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.1V12h2.1V9.8c0-2.2 1.3-3.6 3.6-3.6 1 0 2 .1 3 .2v2.5h-1.7c-1.3 0-1.6.6-1.6 1.5V12h3.1l-.5 2.9h-2.6v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v13H0zM8 8h5v2.3c.7-1.2 2-2.3 4.1-2.3 4 0 4.9 2.6 4.9 6v7h-5v-6.2c0-1.5-0-3.5-2.1-3.5s-2.4 1.6-2.4 3.4V21H8z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4 .6 9.4 .6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.8 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );
}

function IconTikTok() {
  // Basitleştirilmiş TikTok tarzı nota simgesi
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M14.5 2v7.2a5.5 5.5 0 1 1-2.5-1V4.5h2.5c.4 1.7 1.7 3.3 3.3 4.2A7.9 7.9 0 0 0 21 9.3v2.6a9.6 9.6 0 0 1-6.5-2.4V16a5 5 0 1 1-5-5c.5 0 1 .1 1.5.2V2h3.5z" />
    </svg>
  );
}