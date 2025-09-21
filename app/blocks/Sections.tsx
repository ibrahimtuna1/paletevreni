"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";

export default function Sections() {
  return (
    <>
      <LessonFlow />
      <Pricing />
      <FAQ />
    </>
  );
}

/** Ortak beyaz section kabuğu + soft doku animasyonu */
function Shell({
  id,
  title,
  subtitle,
  centerTitle = false,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  centerTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative border-t border-slate-100 bg-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle,rgba(2,6,23,0.04)_1px,transparent_1.2px)] [background-size:18px_18px] [animation:floatY_24s_linear_infinite]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <h2
          className={`text-2xl md:text-3xl font-extrabold text-slate-900 ${
            centerTitle ? "text-center" : ""
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`mt-2 max-w-2xl text-slate-600 ${
              centerTitle ? "mx-auto text-center" : ""
            }`}
          >
            {subtitle}
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
      <style jsx>{`
        @keyframes floatY {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

function LessonFlow() {
  const steps = [
    {
      title: "1. Adım – Öğretmenimiz Çiziyor ve Anlatıyor",
      desc:
        "Her dersimiz 45 dakika sürer. İlk bölümde öğretmenimiz canlı olarak çizim yapar; adımları tek tek gösterir. Çocuklar eşlik ederken hem teknikleri hem de yöntemi öğrenir. Ardından herkesin çizimine tek tek bakılır ve kısa sohbetle güçlü yönler ile geliştirme noktaları belirtilir.",
      img: "/images/section1.png",
      imgAlt: "Öğretmen canlı çizim yaparken ders akışı",
    },
    {
      title: "2. Adım – Bilmecelerle Çizim",
      desc:
        "Dersin ikinci kısmında eğlenceli bilmeceler ve ipuçlarıyla ilerleyen bir çizim oyunu oynarız. Çocuklar buldukça şekilleri ekler, hayal gücü ve problem çözme birlikte gelişir; öğrenme oyunlaştırılarak kalıcı hale gelir.",
      img: "/images/section2.png",
      imgAlt: "Bilmecelerle çizim etkinliği",
    },
    {
      title: "3. Adım – Oyunlarla Pekiştirme",
      desc:
        "Finalde çizimle bağlantılı interaktif mini oyunlarla öğrendiklerimizi pekiştiririz. Çocuklar ürettiklerini paylaşır, akran geri bildirimi alır ve dersten gülümseyerek ayrılır.",
      img: "/images/section3.png",
      imgAlt: "Çizimle ilgili oyunlar",
    },
  ];

  return (
    <Shell
      id="ders-akisi"
      title="Bir Derste Neler Olur?"
      subtitle="Adım adım, canlı ve etkileşimli bir öğrenme deneyimi."
    >
      <div className="space-y-10 md:space-y-16">
        {steps.map((s, i) => {
          const isEven = i % 2 === 1; // 0-based — even index means right-left alternation
          return (
            <div
              key={s.title}
              className="grid items-center gap-8 lg:grid-cols-2"
            >
              {/* Görsel */}
              <div className={isEven ? "lg:order-2" : ""}>
                <SlideIn from={isEven ? "right" : "left"}>
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {/* Görsel henüz eklenmemişse hata vermesin diye Image yine de render edilir; 404 olsa da sayfa patlamaz */}
                    <Image
                      src={s.img}
                      alt={s.imgAlt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      priority={false}
                    />
                  </div>
                </SlideIn>
              </div>

              {/* Metin */}
              <div className={isEven ? "lg:order-1" : ""}>
                <SlideIn from={isEven ? "left" : "right"}>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-3 text-slate-700 leading-relaxed md:text-lg">{s.desc}</p>
                </SlideIn>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(var(--tw-translate-x)); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </Shell>
  );
}

function SlideIn({ children, from = "left" }: { children: React.ReactNode; from?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShow(true);
            io.disconnect(); // bir kez göster ve bırak
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden = from === "left" ? "opacity-0 -translate-x-6" : "opacity-0 translate-x-6";
  const visible = "opacity-100 translate-x-0";

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-all duration-700 ease-out will-change-transform ${show ? visible : hidden}`}
      style={{
        // Tailwind ile uyumlu translate class'ları kullanıyoruz; inline style sadece performans için
      }}
    >
      {children}
    </div>
  );
}

/** Tek paket – indirimi belirgin fiyat kartı */
function Pricing() {
  const oldPrice = 1999; // TL (üstü çizili)
  const price = 1500; // TL (büyük)
  return (
    <Shell
      id="programlar"
      title="Program ve Ücret"
      subtitle="Tanıtım dersimiz ücretsizdir. Asıl program tek pakettir ve her ay 4 canlı ders içerir."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <span className="pointer-events-none absolute right-[-60px] top-6 rotate-45 rounded-md bg-fuchsia-600 px-16 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
            En Uygun
          </span>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">1 Aylık</h3>
              <p className="mt-1 font-semibold text-slate-700">Palet Evreni Premium</p>

              <div className="mt-5 flex items-end gap-3">
                <div className="text-slate-400">
                  <del className="text-lg sm:text-xl">₺{oldPrice.toLocaleString("tr-TR")}</del>
                </div>
                <div className="text-fuchsia-700">
                  <span className="text-4xl font-extrabold sm:text-5xl">
                    ₺{price.toLocaleString("tr-TR")}
                  </span>
                </div>
                <div className="mb-1 text-sm font-semibold text-fuchsia-700/90">/ aylık</div>
              </div>

              <div className="mt-4 rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3 text-sm text-fuchsia-800">
                Dersler hafta içi günlerde <strong>19:00 (TR)</strong>’de başlar. Süre{" "}
                <strong>40 + 40 dk</strong> (toplam 80 dk). Katılım haftada 1 gün, ayda{" "}
                <strong>4 gün</strong>.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/auth?tab=kayit&role=ogrenci"
                  className="rounded-2xl bg-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-fuchsia-500"
                >
                  Kayıt Ol →
                </a>
                <a
                  href="/auth?plan=trial&tab=kayit&role=ogrenci"
                  className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ücretsiz Tanıtım Dersi
                </a>
                <a
                  href="tel:05015303949"
                  className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  0501 530 39 49
                </a>
              </div>
            </div>

            <ul className="grid content-start gap-3 text-slate-700">
              {[
                "4 canlı ders (aylık) + kayıt erişimi",
                "Ödev yükleme ve kişisel geri bildirim",
                "Renk, kompozisyon, dijital boyama",
                "Portfolyo koçluğu",
                "Bildirimler ve takvim",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="leading-6">{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-1 h-5 w-5 flex-none text-emerald-600"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.414l-7.2 7.2a1 1 0 01-1.415 0l-3-3a1 1 0 011.415-1.414l2.293 2.292 6.493-6.492a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** FAQ – animasyonlu, daha büyük ve kalın tipografi, başlık ortada */
function FAQ() {
  const faqs = [
    {
      q: "Dersler nasıl işleniyor?",
      a: "Haftada 1 gün canlı derse katılırsın (80 dk: 40+40). Ders kayıtları panelde kalır; ödev yükleyip kişisel geri bildirim alırsın.",
    },
    {
      q: "Yaş / seviye şartı var mı?",
      a: "Başlangıçtan ileri seviyeye gruplar mevcut. İlk katılımda kısa bir tanıtım/deneme dersi ile seviyeni belirliyoruz.",
    },
    {
      q: "Hangi araçları/uygulamaları kullanıyoruz?",
      a: "Canlı ders ve ödev süreçleri web üzerinden. Grafik tablet veya kağıt-kalem fark etmez; kamerayla paylaşabilirsin.",
    },
    {
      q: "İptal / iade koşulları nelerdir?",
      a: "İlk 7 gün içinde destek ekibi ile iletişime geçerek iptal/iade seçeneklerini kullanabilirsin.",
    },
    {
      q: "Öğretmenle 1-1 iletişim mümkün mü?",
      a: "Ders sonrası notlar ve panel mesajlarıyla 1-1 geri bildirim alırsın. Gerekirse ek randevu planlarız.",
    },
  ];

  return (
    <Shell id="sss" title="Sık Sorulan Sorular" centerTitle>
      <div className="mx-auto max-w-3xl space-y-4">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} question={f.q} answer={f.a} defaultOpen={i === 0} />
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .accordion-enter {
          animation: fadeUp 420ms ease forwards;
        }
      `}</style>
    </Shell>
  );
}

function AccordionItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="accordion-enter group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="text-lg md:text-xl font-semibold text-slate-900">{question}</span>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-transform ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M9 4h2v12H9z" />
              <path d="M4 9h12v2H4z" />
            </svg>
        </span>
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="text-base md:text-lg leading-relaxed text-slate-700 font-medium">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
