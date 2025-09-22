// app/atolye/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Canlı Atölye Dersleri | Palet Evreni",
  description:
    "Canlı atölye dersleriyle dikkat, odaklanma ve yaratıcılığı geliştiren, eğlenceli ve takip edilebilir sanat eğitimi.",
};

export default function AtolyePage() {
  return (
    <main className="bg-white text-slate-900">
      {/* Hero benzeri üst bölüm */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:py-16">
          {/* Görsel */}
          <div className="order-2 md:order-1">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
              <Image
                src="/images/atolye-hero.png" // elinde yoksa /images/hero-figure2.png kullan
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
            <p className="text-xs font-extrabold uppercase tracking-widest text-fuchsia-700">
              Palet Evreni ile
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
              Çocukların{" "}
              <span className="text-fuchsia-700">Resim</span> ve{" "}
              <span className="text-fuchsia-700">El becerileri</span> gelişiyor!
            </h1>

            <h2 className="mt-6 text-xl font-bold">Peki nasıl?</h2>

            <ul className="mt-4 space-y-2 text-lg">
              {[
                "Çizim Teknikleri",
                "Canlı Dersler",
                "Gelişim Takibi",
                "Ödüllendirme Sistemi",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-3.5 w-3.5 flex-none rounded-full bg-fuchsia-600" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <ul className="mt-4 ml-1 space-y-1 text-[17px] text-slate-700">
              <li>• Düzenli rutinler oluşturur.</li>
              <li>• Öğrenmeyi eğlenceli hâle getirir.</li>
              <li>• Motivasyonu artırır.</li>
              <li>• Potansiyeli açığa çıkarır.</li>
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/basvuru"
                className="rounded-full bg-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-fuchsia-500"
              >
                Ücretsiz Tanıtım Dersine Katıl
              </Link>
              <Link
                href="/#paketler"
                className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Paketleri İncele
              </Link>
            </div>
          </div>
        </div>

        {/* Arka plan süsü */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(600px_200px_at_20%_20%,#f5e7ff,transparent),radial-gradient(400px_160px_at_85%_30%,#e6fbff,transparent)]" />
      </section>

      {/* Mini özellikler bloğu */}
      <section className="border-t border-slate-100">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
          {[
            {
              t: "Canlı Etkileşim",
              d: "Soru–cevap ve birebir yönlendirme ile aktif öğrenme.",
            },
            {
              t: "Kayıt & Geri Bildirim",
              d: "Ders kayıtları, ödev yükleme ve kişisel yorumlar.",
            },
            {
              t: "Takip & Motivasyon",
              d: "Rutin planı, rozet/ödül sistemi ve ilerleme görünürlüğü.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-slate-700">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Son CTA */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/basvuru"
              className="rounded-full bg-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-fuchsia-500"
            >
              Hemen Başvur
            </Link>
            <Link
              href="/#sss"
              className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              SSS’yi Gör
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}