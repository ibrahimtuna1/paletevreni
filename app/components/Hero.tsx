"use client";

import Image from "next/image";
import { useMemo, type CSSProperties } from "react";

export default function Hero() {
  // Twinkle noktaları için hafif rastgele ama sabit konumlar
  const dots = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => ({
        left: `${(i * 137) % 100}%`,
        top: `${(i * 73) % 100}%`,
        size: (i % 3) + 2, // 2–4 px
        delay: `${(i * 0.27) % 6}s`,
        dur: `${3 + (i % 5)}s`,
      })),
    []
  );

  return (
    <section id="top" className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Arka plan: daha KOYU pembe→mor degrade + vignette */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-800 via-fuchsia-900 to-purple-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      {/* Partikül katman 1 */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1.2px)] [background-size:18px_18px] [animation:floatY_24s_linear_infinite]" />

      {/* Partikül katman 2: twinkle */}
      <div className="pointer-events-none absolute inset-0">
        {dots.map((d, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/80 [animation:twinkle_var_linear_infinite]"
            style={{
              left: d.left,
              top: d.top,
              width: `${d.size}px`,
              height: `${d.size}px`,
              animationDelay: d.delay,
              animationDuration: d.dur,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* Yumuşak renk parıltıları */}
      <div className="absolute inset-0 mix-blend-screen">
        <div className="absolute -top-40 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-purple-600/25 blur-3xl" />
      </div>

      {/* İçerik */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-24">
        {/* Sol: görsel */}
        <div className="order-2 md:order-1">
          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="absolute -inset-2 -z-10 rounded-[2.25rem] bg-gradient-to-br from-pink-300/30 via-fuchsia-300/30 to-purple-300/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 p-4 backdrop-blur">
              <div className="relative aspect-[4/5] w-full">
                <Image src="/images/hero-figure.png" alt="Palet Evreni" fill priority className="object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: metin + CTA */}
        <div className="order-1 md:order-2">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Palet Evreni ile
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] text-white drop-shadow-sm sm:text-6xl">
            <span className="block">Sanat Yolculuğunda</span>
            <span className="mt-1 block bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              %100 Etkileşimli Başlangıç
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
            Canlı dersler, ödev geri bildirimi ve portfolyo koçluğu. Evinden çıkmadan yaratıcı dünyanı büyüt.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a href="#auth" className="rounded-full bg-pink-500 px-8 py-4 text-center text-lg font-semibold text-white shadow-xl shadow-pink-500/30 transition hover:-translate-y-0.5 hover:bg-pink-400">
              Hemen Başla →
            </a>
            <a href="#programlar" className="rounded-full border border-white/25 bg-white/10 px-8 py-4 text-center text-lg font-semibold text-white/90 backdrop-blur transition hover:bg-white/20">
              Programları Gör
            </a>
          </div>

          <div className="mt-8 flex items-center gap-2">
            <Dot active /><Dot /><Dot /><Dot />
          </div>
        </div>
      </div>

      {/* oklar (opsiyonel) */}
      <button aria-label="Önceki" className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur transition hover:bg-white/30 md:inline-flex">‹</button>
      <button aria-label="Sonraki" className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur transition hover:bg-white/30 md:inline-flex">›</button>

      <style jsx>{`
        @keyframes floatY {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes twinkle_var {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
      `}</style>
    </section>
  );
}

function Dot({ active = false }: { active?: boolean }) {
  return <span className={`h-3 w-3 rounded-full transition ${active ? "bg-white" : "bg-white/40"}`} />;
}
