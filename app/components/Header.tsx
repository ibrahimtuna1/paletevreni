// app/components/Header.tsx
"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="relative z-20 border-b border-white/10 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-black tracking-tight">
          Palet<span className="text-fuchsia-400">Evreni</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a href="#programlar" className="hover:text-white">Programlar</a>
          <a href="#nasil" className="hover:text-white">Nasıl Çalışır?</a>
          <a href="#sss" className="hover:text-white">SSS</a>

          {/* route -> /auth */}
          <Link
            href="/auth"
            className="rounded-full bg-white/10 px-4 py-1.5 hover:bg-white/20"
          >
            Giriş / Kayıt
          </Link>
        </nav>
      </div>
    </header>
  );
}
