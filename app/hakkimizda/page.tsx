// app/hakkimizda/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
// import SiteHeader from "../components/SiteHeader"; // kaldırdık

export default function HakkimizdaPage() {
  return (
    <>
      {/* <SiteHeader />  // vazgeçtiğin için kaldırdık */}

      <AboutHero />

      {/* PASTEL ANİMASYONLU ARKA PLANLI YÜZEY (siyah yok) */}
      <section className="relative overflow-hidden bg-[#FCF8FF]">
        {/* yumuşak hareket eden blob’lar */}
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

        {/* İçerik – açık zemin, koyu ve okunur metin */}
        <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-slate-800">
          {/* Sanat neden önemli? */}
          <section id="neden-sanat" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
                Sanat Neden Önemli?
              </span>
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card
                title="Özgüven & İfade"
                text="Resim yaparken çocuklar duygularını güvenli bir alanda ifade eder; üretim süreci özgüveni besler."
              />
              <Card
                title="Odaklanma & Sabır"
                text="Aşamaları takip etmek, detaya dikkat ve bitirme disiplini gelişir."
              />
              <Card
                title="Yaratıcılık & Problem Çözme"
                text="Renk, kompozisyon, doku gibi kararlar çocukların yaratıcı düşünmesini güçlendirir."
              />
              <Card
                title="Portfolyo & Gelecek"
                text="Hedef okullara uygun, düzenli ve gelişim gösteren bir portfolyo oluşturulur."
              />
            </div>
          </section>

          {/* Yöntemimiz */}
          <section id="yontem" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Yöntemimiz
              </span>
            </h2>
            <ul className="mt-4 grid gap-3 text-slate-700">
              <li>• Haftalık canlı atölye dersleri (soru–cevap, birebir yönlendirme).</li>
              <li>• Ödev geri bildirimi: kuvvetli yönler + geliştirilecek alanlar.</li>
              <li>• Portfolyo koçluğu: konu seçimi, ilerleme planı, düzen.</li>
              <li>• Topluluk: paylaşımlar, mini etkinlikler, motivasyon döngüsü.</li>
            </ul>
          </section>

          {/* Eğitmen yaklaşımı */}
          <section id="egitmen" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
                Eğitmen Yaklaşımı
              </span>
            </h2>
            <p className="mt-4 max-w-3xl">
              Eğitmenlerimiz, her çocuğun eşsiz bir sanat dili olduğuna inanır. Yaşa ve
              seviyeye göre kişiselleştirilmiş yönlendirme yapar; eleştiride kırıcı
              değil, geliştiricidir. Hedefimiz, “çocuğun kendi stilini bulmasıdır”.
            </p>
          </section>

          {/* SSS kısayolu */}
          <section className="mb-20">
            <div className="rounded-2xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-violet-50 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Sık Sorulan Sorular</h3>
              <p className="mt-2">
                Ders süresi, materyaller, yaş grupları ve ücretlendirme hakkında merak
                ettikleriniz için SSS bölümümüze göz atın.
              </p>
              <div className="mt-4">
                <Link
                  href="/#faq"
                  className="inline-flex rounded-full px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(90deg, #ff4fb8, #ff7bd1, #b794f4)",
                    boxShadow: "0 10px 22px rgba(180, 100, 255, 0.25)",
                  }}
                >
                  SSS’ye Git
                </Link>
              </div>
            </div>
          </section>

          {/* Son CTA */}
          <section className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/basvuru"
                className="rounded-full px-6 py-3 font-semibold text-white shadow-lg hover:-translate-y-0.5 transition"
                style={{
                  background:
                    "linear-gradient(90deg, #ff4fb8, #ff7bd1, #ffa4e0)",
                  boxShadow: "0 20px 40px rgba(255, 100, 180, 0.25)",
                }}
              >
                Ücretsiz Tanıtım Dersi
              </Link>
              <Link
                href="/#paketler"
                className="rounded-full px-6 py-3 font-semibold border border-fuchsia-200 bg-white/70 text-slate-900 backdrop-blur hover:bg-white transition"
              >
                Paketleri İncele
              </Link>
            </div>
          </section>
        </main>

        {/* styled-jsx: blob animasyonları */}
        <style jsx global>{`
          .blob { position: absolute; border-radius: 50%; filter: blur(24px); }
          @keyframes drift1 {
            0% { transform: translate(0,0) scale(1); }
            50% { transform: translate(30px,-20px) scale(1.06); }
            100% { transform: translate(0,0) scale(1); }
          }
          @keyframes drift2 {
            0% { transform: translate(0,0) scale(1); }
            50% { transform: translate(-20px,25px) scale(1.05); }
            100% { transform: translate(0,0) scale(1); }
          }
          @keyframes drift3 {
            0% { transform: translate(-50%,0) scale(1); }
            50% { transform: translate(calc(-50% + 28px),-18px) scale(1.07); }
            100% { transform: translate(-50%,0) scale(1); }
          }
          .animate-drift1 { animation: drift1 18s ease-in-out infinite; }
          .animate-drift2 { animation: drift2 22s ease-in-out infinite; }
          .animate-drift3 { animation: drift3 26s ease-in-out infinite; }
        `}</style>
      </section>
    </>
  );
}

/* === HERO (Hakkımızda) === */
function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Arka plan */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #041418 0%, #cb6ce6 100%)" }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24 text-white">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Palet Evreni</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
            Çocuklarla Sanatın{" "}
            <span className="bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              en eğlenceli hâli
            </span>
          </h1>
          <p className="mt-4 text-white/90">
            Çocuklarınızın hayal gücünü oyunla buluşturuyoruz. Canlı atölyeler,
            kişisel geri bildirimler ve portfolyo koçluğuyla her çocuk kendi stilini keşfeder.
          </p>
          <ul className="mt-6 space-y-2 text-white/95">
            {[
              "Haftalık canlı atölye dersleri",
              "Ödev yükleme ve kişisel geri bildirim",
              "Renk, kompozisyon, dijital boyama",
              "Portfolyo koçluğu ve ilerleme takibi",
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
              href="/#paketler"
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

      {/* Wave ayırıcı */}
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