// app/atolye/page.tsx
import Image from "next/image";
import Link from "next/link";
import Testimonials from "./Testimonials";

export const metadata = {
  title: "Canlı Atölye Dersleri | Palet Evreni",
  description:
    "Canlı atölye dersleriyle dikkat, odaklanma ve yaratıcılığı geliştiren, eğlenceli ve takip edilebilir sanat eğitimi.",
};

export default function AtolyePage() {
  return (
    <main className="relative text-slate-900">
      {/* 🌸 Tüm sayfa arka plan resmi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[url('/images/atolye-bg.png')] bg-top bg-no-repeat bg-cover"
      />
      {/* Okunabilirlik için yumuşak overlay */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-white/70" />

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:py-16">
          {/* Görsel */}
          <div className="order-2 md:order-1">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-3xl border border-rose-100/70 bg-white/70 shadow-sm backdrop-blur-[1px]">
              <Image
                src="/images/atolyee-hero.png"
                alt="Canlı atölye derslerinde mutlu çocuk"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 560px, 90vw"
                priority
              />
            </div>
          </div>

          {/* Metin */}
          <div className="order-1 md:order-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-rose-600">
              Palet Evreni ile
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
              Çocukların <span className="text-rose-600">Resim</span> ve{" "}
              <span className="text-rose-600">El becerileri</span> gelişiyor!
            </h1>

            <h2 className="mt-6 text-xl font-bold">Peki nasıl?</h2>

            {/* Üst maddeler — tipografi eşitlendi */}
            <ul className="mt-4 space-y-2 text-[17px] sm:text-lg font-medium text-slate-800">
              {[
                "Çizim Teknikleri",
                "Canlı Dersler",
                "Gelişim Takibi",
                "Ödüllendirme Sistemi",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-3.5 w-3.5 flex-none rounded-full bg-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Alt maddeler — aynı tipografi + aynı dot */}
            <ul className="mt-4 space-y-2 text-[17px] sm:text-lg font-medium text-slate-800">
              {[
                "Düzenli rutinler oluşturur.",
                "Öğrenmeyi eğlenceli hâle getirir.",
                "Motivasyonu artırır.",
                "Potansiyeli açığa çıkarır.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-3.5 w-3.5 flex-none rounded-full bg-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* ⛔ Hero CTA kaldırıldı */}
          </div>
        </div>
      </section>

      {/* Kazanımlar */}
      <section className="border-t border-rose-100/70">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
            Kazanımlar
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Kaliteli Zaman Geçirsin",
                desc:
                  "Ekran süresini verimli, eğlenceli ve öğretici aktivitelere çeviriyoruz.",
                emoji: "😊",
                classes:
                  "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200",
                iconBg: "bg-rose-100",
                iconHoverBg: "group-hover:bg-rose-200",
              },
              {
                title: "Dikkat ve Odaklanma Gelişsin",
                desc:
                  "Özel tasarlanmış etkinliklerle dikkat ve konsantrasyon süresi artar.",
                emoji: "🎯",
                classes:
                  "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200",
                iconBg: "bg-rose-100",
                iconHoverBg: "group-hover:bg-rose-200",
              },
              {
                title: "Becerileri Gelişsin",
                desc:
                  "Algılama, mantık kurma ve problem çözme kapasitesi güçlenir.",
                emoji: "🧩",
                classes:
                  "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200",
                iconBg: "bg-rose-100",
                iconHoverBg: "group-hover:bg-rose-200",
              },
              {
                title: "Özgüveni Artsın",
                desc:
                  "Başarılarını fark eden çocuk, yeni öğrenmelere gönüllü hale gelir.",
                emoji: "🦸‍♂️",
                classes:
                  "bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200",
                iconBg: "bg-rose-100",
                iconHoverBg: "group-hover:bg-rose-200",
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`group rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${f.classes}`}
              >
                <div
                  className={`mb-4 inline-grid h-16 w-16 place-items-center rounded-2xl text-3xl transition-colors ${f.iconBg} ${f.iconHoverBg}`}
                >
                  <span aria-hidden>{f.emoji}</span>
                </div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-slate-700">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Alt CTA bırakıldı (istersen bunu da kaldırırız) */}
          <div className="mt-10 text-center">
            <Link
              href="/basvuru"
              className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-8 py-4 text-base font-extrabold text-white shadow-lg transition hover:bg-orange-400 active:scale-[.99]"
            >
              Ücretsiz Tanıtım Dersi Başvurusu
            </Link>
          </div>
        </div>
      </section>

      {/* Veli Memnuniyeti */}
      <Testimonials />
    </main>
  );
}
