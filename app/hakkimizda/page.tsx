// app/hakkimizda/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function HakkimizdaPage() {
  return (
    <>
      <AboutHero />

      <section className="relative overflow-hidden bg-[#FCF8FF]">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <span
            className="blob animate-drift1"
            style={{
              left: "-12rem",
              top: "-10rem",
              width: "42rem",
              height: "42rem",
              background:
                "radial-gradient(closest-side, rgba(255,182,244,.45), rgba(255,182,244,0))",
            }}
          />
          <span
            className="blob animate-drift2"
            style={{
              right: "-14rem",
              top: "28%",
              width: "36rem",
              height: "36rem",
              background:
                "radial-gradient(closest-side, rgba(189,178,255,.40), rgba(189,178,255,0))",
            }}
          />
          <span
            className="blob animate-drift3"
            style={{
              left: "45%",
              bottom: "-12rem",
              width: "48rem",
              height: "48rem",
              transform: "translateX(-50%)",
              background:
                "radial-gradient(closest-side, rgba(168,237,255,.35), rgba(168,237,255,0))",
            }}
          />
        </div>

        <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-slate-800">
          <section id="neden-sanat" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
                Sanat Neden Önemli?
              </span>
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card
                title="Özgüven & İfade"
                text="Üretirken duygularını güvenli bir alanda ifade ederler; süreç özgüveni besler."
              />
              <Card
                title="Odaklanma & Sabır"
                text="Aşamaları takip, detaya dikkat ve bitirme disiplini gelişir."
              />
              <Card
                title="Yaratıcılık & Problem Çözme"
                text="Renk, kompozisyon ve doku kararları yaratıcı düşünmeyi güçlendirir."
              />
              <Card
                title="Portfolyo & Gelecek"
                text="Hedef okullara uygun, düzenli ve gelişimi gösteren bir portfolyo oluşur."
              />
            </div>
          </section>

          <section id="yontem" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Yöntemimiz
              </span>
            </h2>
            <ul className="mt-4 grid gap-3 text-slate-700">
              <li>• Canlı, online atölye dersleri: anlık geri bildirim ve birebir yönlendirme.</li>
              <li>• Ödev yükleme ve değerlendirme: güçlü yönler + net geliştirme önerileri.</li>
              <li>• Portfolyo koçluğu: konu seçimi, ilerleme planı, düzen ve sunum.</li>
              <li>• Toplulukta paylaşım, mini etkinlikler ve sürdürülebilir motivasyon.</li>
            </ul>
          </section>

          <section id="egitmen" className="mb-6 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
                Eğitmen Yaklaşımı
              </span>
            </h2>
            <p className="mt-4 max-w-3xl">
              Her öğrencinin kendine özgü bir sanat dili olduğuna inanıyoruz. Yaş ve seviyeye göre kişiselleştirilmiş,
              motive edici ve net geri bildirimler veriyoruz. Hedefimiz, öğrencinin kendi stilini güvenle geliştirmesi.
            </p>
          </section>
        </main>

        <style jsx global>{`
          .blob { position: absolute; border-radius: 50%; filter: blur(24px); }
          @keyframes drift1 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.06); } 100% { transform: translate(0,0) scale(1); } }
          @keyframes drift2 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,25px) scale(1.05); } 100% { transform: translate(0,0) scale(1); } }
          @keyframes drift3 { 0% { transform: translate(-50%,0) scale(1); } 50% { transform: translate(calc(-50% + 28px),-18px) scale(1.07); } 100% { transform: translate(-50%,0) scale(1); } }
          .animate-drift1 { animation: drift1 18s ease-in-out infinite; }
          .animate-drift2 { animation: drift2 22s ease-in-out infinite; }
          .animate-drift3 { animation: drift3 26s ease-in-out infinite; }
        `}</style>
      </section>

      <Footer />
    </>
  );
}

function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #041418 0%, #cb6ce6 100%)" }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24 text-white">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Palet Evreni</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
            Canlı Online{" "}
            <span className="bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              Sanat Eğitimi
            </span>
          </h1>
          <p className="mt-4 text-white/90">
            Çocuklar hayal gücünü gerçek zamanlı derslerle büyütür. Canlı bağlantıda eğitmenlerimiz yönlendirir,
            anında geri bildirim verir, çalışmalar birlikte gelişir.
          </p>
          <ul className="mt-6 space-y-2 text-white/95">
            {[
              "Canlı, online dersler — interaktif ve küçük gruplar",
              "Anlık geri bildirim ve birebir yönlendirme",
              "Ödev yükleme, düzenli takip ve net hedefler",
              "Portfolyo koçluğu: seçim, süreç, sunum",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-300 ring-4 ring-fuchsia-200/30" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/basvuru"
              className="rounded-full px-6 py-3 font-semibold text-white shadow-xl hover:-translate-y-0.5 transition"
              style={{
                background: "linear-gradient(90deg, #ff4fb8, #ff7bd1, #ffa4e0)",
                boxShadow: "0 20px 40px rgba(255, 100, 180, 0.25)",
              }}
            >
              Ücretsiz Tanıtım Dersi
            </Link>
            <Link
              href="/#programlar"
              className="rounded-full px-6 py-3 font-semibold bg-white/10 hover:bg-white/20 transition"
            >
              Paketlerimizi Gör
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-[1/1] w-full">
            <Image
              src="/images/about-figure.png"
              alt="Palet Evreni"
              fill
              className="object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              priority
            />
          </div>
        </div>
      </div>

      <svg className="block h-12 w-full text-[#FCF8FF]" preserveAspectRatio="none" viewBox="0 0 1200 100">
        <path d="M0,0 C150,80 350,80 600,20 C850,-40 1050,40 1200,0 L1200,100 L0,100 Z" fill="currentColor" />
      </svg>
    </section>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-fuchsia-200/60 bg-white/80 backdrop-blur p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-700">{text}</p>
    </div>
  );
}
