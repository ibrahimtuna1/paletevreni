import type { Metadata } from "next";
import TanitimCarousel from "../components/TanitimCarousel"; // <-- alias yerine relative

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tanıtım Videoları | Palet Evreni",
  description: "Palet Evreni hakkında kısa tanıtım videoları. Her biri ~60 saniye.",
};

const videos = [
  { title: "Palet Evreni | 60 sn Hızlı Tanıtım", src: "/videos/tanitim-1.mp4" },
  { title: "Canlı Atölye: Dersten Kesitler",     src: "/videos/tanitim-2.mp4" },
  { title: "Portfolyo Koçluğu Nedir?",          src: "/videos/tanitim-3.mp4" },
  // { title: "Veli Yorumu (YouTube)", youtubeId: "dQw4w9WgXcQ" },
];

export default function Page() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden text-white">
      {/* Hero benzeri arka plan */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(180deg, #041418 0%, #cb6ce6 100%)",
          transition: "background 500ms ease",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="h-16 md:h-[92px]" aria-hidden />

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-14">
        <header className="mb-6 md:mb-10">
          <h1 className="font-extrabold leading-tight tracking-tight text-[clamp(28px,4.2vw,56px)]">
            <span className="block">Tanıtım</span>
            <span className="mt-1 block bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              Videoları
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">Sağa-sola kaydır; izlemek için dokun.</p>
        </header>

        <TanitimCarousel videos={videos} />
      </section>
    </main>
  );
}