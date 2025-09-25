// app/components/Hero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

type Palette = { top: string; bottom: string };

type Slide = {
  img?: string;
  alt?: string;
  titleTop: string;
  titleGradient: string;
  desc?: string;
  ctaText?: string;
  ctaHref?: string;
  palette: Palette;
};

export default function Hero() {
  // === SLIDES ===
  const slides: Slide[] = [
    {
      img: "/images/hero-figure.png",
      alt: "Palet Evreni",
      titleTop: "Ücretsiz",
      titleGradient: "Tanıtım Dersi",
      desc:
        "Palet Evreni’nde çocuklarınız hem eğlenecek hem de sanatla kendini ifade etmenin keyfini keşfedecek. Ücretsiz tanıtım dersimizde eğitmenlerimizi tanıyabilir, derslerin nasıl işlendiğini deneyimleyebilirsiniz.",
      ctaText: "HEMEN BAŞVUR",
      ctaHref: "/basvuru",
      palette: { top: "#041418", bottom: "#cb6ce6" },
    },
    {
      img: "/images/hero-figure2.png",
      alt: "Canlı Dersler",
      titleTop: "PALET EVRENİ",
      titleGradient: "Eğitim Modelimiz",
      desc: "Çocukların merakını projeye çeviren akış: kısa anlatım → uygulama → paylaşım. Düzenli, eğlenceli, ölçülebilir.",
      ctaText: "Detaylı Bilgi Al",
      ctaHref: "/atolye",
      palette: { top: "#12061a", bottom: "#008e9a" },
    },
    {
      img: "/images/hero-figure3.png",
      alt: "Paketlerimiz",
      titleTop: "Esnek",
      titleGradient: "Paketlerimiz",
      desc: "Çocuğunuzun ihtiyacına uygun esnek paket seçenekleri.",
      ctaText: "Paketlerimiz",
      ctaHref: "/#programlar",
      palette: { top: "#1a0f00", bottom: "#cc5a00" },
    },
  ];

  const [idx, setIdx] = useState(0);
  const current = slides[idx];
  const currentPalette = current.palette;

  // ---- renk senkronu
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--hero-top", currentPalette.top);
    root.style.setProperty("--hero-bottom", currentPalette.bottom);
  }, [currentPalette]);

  // ---- header davranışı
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const ticking = useRef(false);
  const lastY = useRef(0);

  const handleLogoClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const dy = y - lastY.current;
        setAtTop(y < 8);
        if (dy > 6 && y > 80) setHidden(true);
        else if (dy < -6 || y < 80) setHidden(false);
        lastY.current = y;
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---- canvas (yıldız ağı + mouse)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const MAX_POINTS = 110;
    const LINK_RADIUS = 150;
    const MOUSE_RADIUS = 130;
    const BASE_SPEED = 0.35;
    const MOUSE_FORCE = 0.65;
    const LINE_ALPHA = 0.18;
    const DOT_SIZE = 1.2;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const resize = () => {
      const parent = canvas.parentElement!;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number };
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const pts: P[] = Array.from({ length: MAX_POINTS }, () => ({
      x: rnd(0, canvas.clientWidth || 1200),
      y: rnd(0, canvas.clientHeight || 700),
      vx: rnd(-BASE_SPEED, BASE_SPEED),
      vy: rnd(-BASE_SPEED, BASE_SPEED),
    }));

    let mx = Infinity, my = Infinity;
    let mouseDown = false;
    let attractMode = false;

    const toCanvasCoords = (e: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e as any).clientX - r.left, y: (e as any).clientY - r.top };
    };
    const onMouseMove = (e: MouseEvent) => { const { x, y } = toCanvasCoords(e); mx = x; my = y; };
    const onMouseDown = (e: MouseEvent) => { mouseDown = true; attractMode = e.shiftKey; };
    const onMouseUp = () => { mouseDown = false; };
    const onMouseLeave = () => { mx = my = Infinity; mouseDown = false; };
    const onTouchMove = (e: TouchEvent) => { if (!e.touches[0]) return; const { x, y } = toCanvasCoords(e.touches[0]); mx = x; my = y; };
    const onTouchStart = () => { mouseDown = true; attractMode = false; };
    const onTouchEnd = () => { mouseDown = false; mx = my = Infinity; };

    canvas.addEventListener("mousemove", onMouseMove as any);
    canvas.addEventListener("mousedown", onMouseDown as any);
    canvas.addEventListener("mouseup", onMouseUp as any);
    canvas.addEventListener("mouseleave", onMouseLeave as any);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    const cell = LINK_RADIUS;
    const hash = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;

    const step = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const grid = new Map<string, number[]>();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > h) { p.y = h; p.vy *= -1; }

        const dxm = p.x - mx, dym = p.y - my;
        const d2m = dxm * dxm + dym * dym;
        if (d2m < MOUSE_RADIUS * MOUSE_RADIUS) {
          const d = Math.max(Math.sqrt(d2m), 0.001);
          const dirx = dxm / d, diry = dym / d;
          const sgn = attractMode ? -1 : 1;
          const f = sgn * (1 - d / MOUSE_RADIUS) * MOUSE_FORCE * (mouseDown ? 1 : 0.5);
          p.vx += dirx * f;
          p.vy += diry * f;
        }

        const k = hash(p.x, p.y);
        const arr = grid.get(k);
        if (arr) arr.push(i); else grid.set(k, [i]);
      }

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, DOT_SIZE, 0, Math.PI * 2); ctx.fill(); }

      const neighborOffsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const cx = Math.floor(a.x / cell);
        const cy = Math.floor(a.y / cell);
        for (const [ox, oy] of neighborOffsets) {
          const key = `${cx + ox},${cy + oy}`;
          const idxs = grid.get(key);
          if (!idxs) continue;
          for (const j of idxs) {
            if (j <= i) continue;
            const b = pts[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            const max = LINK_RADIUS * LINK_RADIUS;
            if (d2 < max) {
              const alpha = 0.18 * (1 - d2 / max);
              ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove as any);
      canvas.removeEventListener("mousedown", onMouseDown as any);
      canvas.removeEventListener("mouseup", onMouseUp as any);
      canvas.removeEventListener("mouseleave", onMouseLeave as any);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const next = () => setIdx((i) => (i + 1) % slides.length);
  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);

  // CTA yıldız patlaması
  const burstHostRef = useRef<HTMLDivElement>(null);
  const starBurst = () => {
    const host = burstHostRef.current;
    if (!host) return;
    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement("span");
      el.className = "spark";
      const ang = (Math.PI * 2 * i) / COUNT + Math.random() * 0.6;
      const dist = 40 + Math.random() * 70;
      el.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1));
      el.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1));
      el.style.setProperty("--delay", (Math.random() * 60).toFixed(0) + "ms");
      host.appendChild(el);
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }
  };

  return (
    <section id="top" className="relative overflow-hidden" style={{ minHeight: "82svh" }}>
      {/* Arka plan */}
      <div
        className="fixed inset-0 -z-30"
        style={{
          background: `linear-gradient(180deg, ${currentPalette.top} 0%, ${currentPalette.bottom} 100%)`,
          transition: "background 500ms ease",
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 z-10" style={{ cursor: "none" }} />

      {/* Header */}
      <header
        data-hidden={hidden ? "true" : "false"}
        data-attop={atTop ? "true" : "false"}
        className={["fixed inset-x-0 top-0 z-40 transition-transform duration-300", hidden ? "-translate-y-full" : ""].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 backdrop-saturate-150"
          style={{
            WebkitBackdropFilter: atTop ? "blur(4px)" : "blur(8px)",
            backdropFilter: atTop ? "blur(4px)" : "blur(8px)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
        <div className="relative flex h-16 md:h-[92px] w-full items-center px-0 pr-2 sm:pr-4 lg:pr-8">
          <Link href="/" onClick={handleLogoClick} aria-label="Palet Evreni - en üste git" className="inline-flex items-center select-none shrink-0">
            <Image src="/images/logo.png" alt="Palet Evreni" width={300} height={120} priority sizes="(min-width:1024px) 300px, (min-width:768px) 240px, 180px" className="h-12 w-auto md:h-[84px] origin-left scale-110 md:scale-[1.25] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" draggable={false} />
          </Link>

          {/* NAV */}
          <nav className="ml-auto hidden md:flex items-center gap-3 text-sm">
            <a href="/#programlar" className="btn-gpill from-emerald-500 via-emerald-600 to-emerald-500">Paketlerimiz</a>
            <a href="/tanitim-videolari" className="btn-gpill from-cyan-500 via-blue-500 to-cyan-500">Tanıtım Videoları</a>
            <a href="/hakkimizda" className="btn-gpill from-pink-500 via-violet-500 to-pink-500">Hakkımızda</a>
            <a href="#iletisim" className="btn-gpill from-amber-500 via-rose-500 to-amber-500">İletişim</a>
          </nav>
        </div>
      </header>

      <div className="h-16 md:h-[92px]" aria-hidden />

      {/* SLIDE TRACK */}
      <div className="relative z-20" style={{ minHeight: "calc(82svh - 0px)" }}>
        <div className="relative w-full overflow-hidden" style={{ height: "calc(82svh - 0px)" }}>
          <div
            className="flex h-full w-full flex-row transition-transform duration-700 ease-in-out will-change-transform"
            style={{ width: `${slides.length * 100}svw`, transform: `translate3d(-${idx * 100}svw, 0, 0)` }}
          >
            {slides.map((s, i) => (
              <div
                key={i}
                className="grid w-[100svw] min-w-0 grid-cols-1 items-center gap-8 px-5 md:grid-cols-[1.05fr_1fr]"
                style={{ height: "82svh", paddingTop: "3vh", paddingBottom: "0" }}
              >
                {/* Sol: Görsel – DİBE SABİT */}
                <div className="relative order-2 md:order-1 h-full">
                  <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl md:max-w-2xl h-[56vh] md:h-[72vh]">
                    <div className="relative w-full h-full">
                      {s.img ? (
                        <Image
                          src={s.img}
                          alt={s.alt || "Görsel"}
                          fill
                          priority={i === 0}
                          className="object-contain object-bottom select-none"
                        />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sağ: Metin + CTA */}
                <div className="order-1 md:order-2 md:pr-6">
                  <h1 className="text-white drop-shadow-sm font-extrabold leading-tight tracking-tight text-[clamp(26px,3.8vw,50px)]">
                    <span className="block">{s.titleTop}</span>
                    <span className="mt-1 block bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">{s.titleGradient}</span>
                  </h1>

                  {s.desc && <p className="mt-4 max-w-xl text-white/85 text-[clamp(14px,1.6vw,18px)]">{s.desc}</p>}

                  {s.ctaText && s.ctaHref && (
                    <div className="mt-7 relative" ref={i === idx ? burstHostRef : undefined}>
                      {s.ctaHref.startsWith("/") ? (
                        <Link
                          href={s.ctaHref}
                          onMouseEnter={i === idx ? starBurst : undefined}
                          onFocus={i === idx ? starBurst : undefined}
                          className="relative inline-flex items-center justify-center rounded-full px-9 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 focus:outline-none"
                          style={{ background: "linear-gradient(90deg, #ff4fb8, #ff7bd1, #ffa4e0)", boxShadow: "0 20px 40px rgba(255, 100, 180, 0.25)" }}
                        >
                          <span className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                            <span className="shine absolute -inset-1 translate-x-[-120%] blur-[6px]" />
                          </span>
                          <span className="relative z-10">{s.ctaText}</span>
                        </Link>
                      ) : (
                        <a
                          href={s.ctaHref}
                          onMouseEnter={i === idx ? starBurst : undefined}
                          onFocus={i === idx ? starBurst : undefined}
                          className="relative inline-flex items-center justify-center rounded-full px-9 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 focus:outline-none"
                          style={{ background: "linear-gradient(90deg, #ff4fb8, #ff7bd1, #ffa4e0)", boxShadow: "0 20px 40px rgba(255, 100, 180, 0.25)" }}
                        >
                          <span className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                            <span className="shine absolute -inset-1 translate-x-[-120%] blur-[6px]" />
                          </span>
                          <span className="relative z-10">{s.ctaText}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sayfa göstergesi */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
            <div className="flex items-center gap-3">
              <div className="pointer-events-auto flex items-center gap-2">
                {slides.map((_, j) => (
                  <button
                    key={j}
                    onClick={() => setIdx(j)}
                    className={`h-2.5 w-2.5 rounded-full transition ${j === idx ? "bg-white" : "bg-white/40"}`}
                    aria-label={`Sayfa ${j + 1}`}
                  />
                ))}
              </div>
              <span className="select-none text-sm text-white/80">{idx + 1} / {slides.length}</span>
            </div>
          </div>

          {/* Oklar */}
          <button aria-label="Önceki" onClick={prev} className="absolute left-3 top-1/2 z-30 -translate-y-1/2 inline-flex rounded-full bg-white/20 p-3 text-white backdrop-blur transition hover:bg-white/30 min-h-[44px] min-w-[44px]">‹</button>
          <button aria-label="Sonraki" onClick={next} className="absolute right-3 top-1/2 z-30 -translate-y-1/2 inline-flex rounded-full bg-white/20 p-3 text-white backdrop-blur transition hover:bg-white/30 min-h-[44px] min-w-[44px]">›</button>
        </div>
      </div>

      <style jsx>{`
        .btn-gpill { --gp: linear-gradient(90deg, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to)); position: relative; display: inline-flex; align-items: center; padding: 0.375rem 1rem; border-radius: 9999px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; color: #fff; background-image: var(--gp); background-size: 200% 200%; box-shadow: 0 6px 18px rgba(0,0,0,.12); transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease, background-position 500ms ease; overflow: hidden; isolation: isolate; }
        .btn-gpill::after { content:""; position:absolute; inset:-150% -40%; background: radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,.45), rgba(255,255,255,0) 60%); transform: translateX(-60%); opacity:0; transition:opacity 200ms ease, transform 600ms ease; pointer-events:none; z-index:-1; }
        .btn-gpill:hover { transform: translateY(-1px); filter: saturate(1.1); background-position: 100% 0%; box-shadow: 0 10px 28px rgba(0,0,0,.18); }
        .btn-gpill:hover::after { opacity:1; transform: translateX(60%); }
        .btn-gpill:active { transform: translateY(0) scale(.99); box-shadow: 0 6px 18px rgba(0,0,0,.14); }
        @media (prefers-reduced-motion: reduce) { .btn-gpill, .btn-gpill::after { transition: none; } }
        .shine { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%); animation: shine-move 2.6s ease-in-out infinite; }
        @keyframes shine-move { 0% { transform: translateX(-120%); } 60%,100% { transform: translateX(140%); } }
        .spark { position:absolute; left:50%; top:50%; width:4px; height:4px; border-radius:9999px; background:white; box-shadow:0 0 10px rgba(255,255,255,.8), 0 0 2px rgba(255,255,255,1) inset; transform: translate(-50%, -50%); animation: spark-move 700ms ease-out forwards, spark-fade 700ms ease-out forwards; animation-delay: var(--delay, 0ms); pointer-events:none; z-index:5; }
        @keyframes spark-move { to { transform: translate(calc(-50% + var(--dx)*1px), calc(-50% + var(--dy)*1px)) scale(.8); } }
        @keyframes spark-fade { 0%{opacity:1} 80%{opacity:.8} 100%{opacity:0} }
      `}</style>
    </section>
  );
}
