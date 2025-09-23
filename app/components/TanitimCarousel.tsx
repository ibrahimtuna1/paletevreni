// app/components/TanitimCarousel.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Vid = {
  title: string;
  src?: string;        // /videos/...mp4
  poster?: string;     // varsa kullan; yoksa ilk kareden üret
  youtubeId?: string;  // YouTube için iframe
};

export default function TanitimCarousel({ videos }: { videos: Vid[] }) {
  const [idx, setIdx] = useState(0);

  // refs
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const generatedRef = useRef<Set<string>>(new Set()); // aynı src için bir kez üret

  /* ---------- helpers ---------- */
  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[i] = el;
  };
  const setVideoRef = (i: number) => (el: HTMLVideoElement | null) => {
    videoRefs.current[i] = el;
  };

  const go = (i: number) => {
    const t = trackRef.current;
    const c = cardRefs.current[i];
    if (!t || !c) return;
    t.scrollTo({
      left: c.offsetLeft - t.clientWidth / 2 + c.clientWidth / 2,
      behavior: "smooth",
    });
  };
  const next = () => go(Math.min(idx + 1, videos.length - 1));
  const prev = () => go(Math.max(idx - 1, 0));

  /* ---------- aktif kartı scroll ile takip et ---------- */
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const items = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    const io = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const i = items.findIndex((el) => el === best.target);
        if (i !== -1) setIdx(i);
      },
      { root: t, threshold: [0.3, 0.6, 0.8] }
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---------- aktif olmayan videoları durdur ---------- */
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (v && i !== idx && !v.paused) v.pause();
    });
  }, [idx]);

  /* ---------- klavye okları ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  /* ---------- poster oto-üretim (poster yoksa ilk kareden) ---------- */
  useEffect(() => {
    const makePoster = (v: HTMLVideoElement) => {
      const key = v.currentSrc || v.src;
      if (!key || generatedRef.current.has(key)) return;

      const grab = () => {
        try {
          const W = 540,
            H = 960,
            targetAR = W / H;
          const vw = v.videoWidth,
            vh = v.videoHeight,
            videoAR = vw / vh;

          const canvas = document.createElement("canvas");
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext("2d");
          if (!ctx || !vw || !vh) return;

          let sx = 0,
            sy = 0,
            sw = vw,
            sh = vh;
          if (videoAR > targetAR) {
            sh = vh;
            sw = sh * targetAR;
            sx = (vw - sw) / 2;
            sy = 0;
          } else {
            sw = vw;
            sh = sw / targetAR;
            sx = 0;
            sy = (vh - sh) / 2;
          }

          ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          v.setAttribute("poster", dataUrl);
          generatedRef.current.add(key);
        } catch {
          /* sessiz geç */
        }
      };

      const doSeekAndGrab = () => {
        const toTime = Math.min(0.15, v.duration || 0.15);
        const onSeeked = () => {
          grab();
          v.removeEventListener("seeked", onSeeked);
        };
        v.addEventListener("seeked", onSeeked, { once: true });
        v.pause();
        v.currentTime = toTime;
      };

      if (v.readyState >= 2) {
        // metadata hazır → direkt ilk kareyi al
        doSeekAndGrab();
      } else {
        const onLoaded = () => makePoster(v);
        v.addEventListener("loadeddata", onLoaded, { once: true });
        v.preload = "auto";
        v.load();
      }
    };

    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      const hasPoster = !!videos[i]?.poster;
      const isYouTube = !!videos[i]?.youtubeId;
      if (!hasPoster && !isYouTube) makePoster(v);
    });
  }, [videos]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar mx-auto flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 py-4 md:gap-8 md:px-10"
        style={{ scrollPadding: "0 16px" }}
      >
        {videos.map((v, i) => (
          <div
            key={i}
            ref={setCardRef(i)}
            className={[
              "group relative snap-center shrink-0",
              "h-[78vh] max-h-[880px] aspect-[9/16]",
              "rounded-[28px] ring-1 ring-white/10 bg-white/5 backdrop-blur",
              "shadow-[0_20px_80px_rgba(0,0,0,0.35)]",
              i === idx ? "outline outline-2 outline-white/30" : "outline-none",
            ].join(" ")}
          >
            {/* Glow */}
            <div
              className={[
                "pointer-events-none absolute -inset-1 rounded-[32px] blur-2xl transition-opacity duration-500",
                i === idx
                  ? "opacity-60 bg-[radial-gradient(40%_60%_at_50%_50%,rgba(255,255,255,0.25),transparent)]"
                  : "opacity-0",
              ].join(" ")}
            />

            {/* Media */}
            <div className="absolute inset-0 overflow-hidden rounded-[28px]">
              {v.youtubeId ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${v.youtubeId}`}
                  title={v.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={setVideoRef(i)} // ✅ void döndüren callback
                  className="absolute inset-0 h-full w-full object-cover"
                  poster={v.poster}
                  preload={v.poster ? "metadata" : "auto"}
                  controls
                  playsInline
                >
                  {v.src && <source src={v.src} type="video/mp4" />}
                  Tarayıcınız video etiketini desteklemiyor.
                </video>
              )}
            </div>

            {/* Başlık */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
              <div className="rounded-2xl bg-black/35 px-4 py-3 backdrop-blur">
                <h2 className="text-sm md:text-base font-semibold leading-snug line-clamp-2">
                  {v.title}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Oklar */}
      <button
        aria-label="Önceki"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 backdrop-blur transition hover:bg-white/25 md:left-4"
      >
        ‹
      </button>
      <button
        aria-label="Sonraki"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 backdrop-blur transition hover:bg-white/25 md:right-4"
      >
        ›
      </button>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {videos.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Video ${i + 1}`}
            className={["h-2.5 w-2.5 rounded-full transition", i === idx ? "bg-white" : "bg-white/40"].join(" ")}
          />
        ))}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
