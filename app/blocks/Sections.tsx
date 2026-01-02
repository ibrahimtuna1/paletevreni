"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

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
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
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
          const isEven = i % 2 === 1;
          return (
            <div key={s.title} className="grid items-center gap-8 lg:grid-cols-2">
              {/* Görsel */}
              <div className={isEven ? "lg:order-2" : ""}>
                <SlideIn from={isEven ? "right" : "left"}>
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
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

function SlideIn({
  children,
  from = "left",
}: {
  children: React.ReactNode;
  from?: "left" | "right";
}) {
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
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden =
    from === "left" ? "opacity-0 -translate-x-6" : "opacity-0 translate-x-6";
  const visible = "opacity-100 translate-x-0";

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-all duration-700 ease-out will-change-transform ${
        show ? visible : hidden
      }`}
    >
      {children}
    </div>
  );
}

/** ==== PROGRAM & ÜCRET – 1/3/6 Aylık + 30 Günlük Sayaç Kampanyası ==== */
function Pricing() {
  const MONTHLY = 1750;

  // Kampanya bitişi: 30 gün sonrası 23:59:59
  const campaignUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const { days, hours, minutes, seconds, expired } = useCountdown(campaignUntil);

  const plans = [
    { months: 1, discount: 0,    badge: "Yeni Başlayan", accent: "from-sky-500 to-cyan-500",    featured: false },
    { months: 3, discount: 0.1,  badge: "%10 İndirim",   accent: "from-fuchsia-500 to-violet-500", featured: true },
    { months: 6, discount: 0.15, badge: "%15 İndirim",   accent: "from-emerald-500 to-teal-500",  featured: false },
  ] as const;

  return (
    <Shell
      id="programlar"
      title="Program ve Ücret"
      subtitle="Tanıtım dersimiz ücretsizdir. Premium program haftada 1 canlı ders ile ayda 4 ders içerir."
    >
      {/* Sayaç şeridi */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2 px-4 py-3 sm:flex-row sm:justify-between">
          <p className="font-semibold text-slate-800">
            Kampanya: <span className="text-fuchsia-700">3 Ay Paket Alımında %10</span>,{" "}
            <span className="text-emerald-700">6 Ay Paket Alımında %15</span> – İndirim sınırlı süre ile geçerli!
          </p>
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              expired ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-white"
            }`}
            aria-live="polite"
          >
            <ClockIcon />
            {expired ? (
              <span>Kampanya bitti</span>
            ) : (
              <span>
                Bitişe: {days}g {hours}sa {minutes}dk {seconds}sn
              </span>
            )}
          </div>
        </div>
        <div
          className={`h-1 w-full transition-all ${
            expired ? "bg-slate-100" : "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-emerald-500"
          }`}
        />
      </div>

      {/* Plan kartları – kart içi CTA YOK */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const oldTotal = MONTHLY * p.months;
          const effectiveDiscount = expired ? 0 : p.discount;
          const newTotal = Math.round(oldTotal * (1 - effectiveDiscount));
          const perMonth = Math.round(newTotal / p.months);

          return (
            <div
              key={p.months}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl will-change-transform"
            >
              {/* üst şerit */}
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${p.accent}`} />

              {/* rozetler */}
              <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                {p.featured && (
                  <span className="rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
                    En Popüler
                  </span>
                )}
                {effectiveDiscount > 0 ? (
                  <span className="rounded-md bg-fuchsia-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
                    {p.badge}
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {p.badge}
                  </span>
                )}
              </div>

              {/* başlık */}
              <h3 className="text-2xl font-extrabold text-slate-900">{p.months} Aylık</h3>
              <p className="mt-1 font-semibold text-slate-700">Palet Evreni Premium</p>

              {/* fiyatlar */}
              <div className="mt-5 flex items-end gap-3">
                {effectiveDiscount > 0 ? (
                  <>
                    <div className="text-slate-400">
                      <del className="text-lg sm:text-xl">
                        ₺{oldTotal.toLocaleString("tr-TR")}
                      </del>
                    </div>
                    <div className="text-fuchsia-700">
                      <span className="text-3xl font-extrabold sm:text-4xl">
                        ₺{newTotal.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-900">
                    <span className="text-3xl font-extrabold sm:text-4xl">
                      ₺{oldTotal.toLocaleString("tr-TR")}
                    </span>
                  </div>
                )}
                <div className="mb-1 text-sm font-semibold text-slate-600">/ toplam</div>
              </div>

              <div className="mt-2 text-sm text-slate-600">
                Aylık efektif: <strong>₺{perMonth.toLocaleString("tr-TR")}</strong>
              </div>

              {/* özellikler */}
              <ul className="mt-6 space-y-2 text-slate-700">
                {[
                  `${p.months * 4} canlı ders (${p.months} ay) + kayıt erişimi`,
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
          );
        })}
      </div>

      {/* === TEK ORTAK CTA SATIRI === */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/basvuru"
          className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
          aria-label="Başvuru Yap"
        >
          Başvuru Yap →
        </Link>

        <a
          href="tel:05015303949"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          aria-label="Telefon ile iletişim kur: 0501 530 39 49"
        >
          <PhoneIcon />
          <span>0501 530 39 49</span>
        </a>

        <Link
          href="/atolye"
          className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          aria-label="Daha fazla bilgi al"
        >
          Daha Fazla Bilgi Al
        </Link>
      </div>
    </Shell>
  );
}

/** Basit geri sayım kancası */
function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const expired = diff <= 0;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((diff / 1000) % 60)
    .toString()
    .padStart(2, "0");
  return { days, hours, minutes, seconds, expired };
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12a.75.75 0 00-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.25 4.5A2.25 2.25 0 014.5 2.25h2.172c.516 0 .98.332 1.128.825l1.08 3.6a1.25 1.25 0 01-.316 1.24l-1.4 1.4a14.25 14.25 0 006.821 6.821l1.4-1.4a1.25 1.25 0 011.24-.316l3.6 1.08c.493.148.825.612.825 1.128V19.5a2.25 2.25 0 01-2.25 2.25H18A15.75 15.75 0 012.25 6V4.5z" />
    </svg>
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
    { q: "Dersler nasıl işleniyor?", a: "Haftada 1 gün canlı derse katılırsın (80 dk: 40+40). Ders kayıtları panelde kalır; ödev yükleyip kişisel geri bildirim alırsın." },
    { q: "Yaş / seviye şartı var mı?", a: "Başlangıçtan ileri seviyeye gruplar mevcut. İlk katılımda kısa bir tanıtım/deneme dersi ile seviyeni belirliyoruz." },
    { q: "Hangi araçları/uygulamaları kullanıyoruz?", a: "Canlı ders ve ödev süreçleri web üzerinden. Grafik tablet veya kağıt-kalem fark etmez; kamerayla paylaşabilirsin." },
    { q: "İptal / iade koşulları nelerdir?", a: "İlk 7 gün içinde destek ekibi ile iletişime geçerek iptal/iade seçeneklerini kullanabilirsin." },
    { q: "Öğretmenle 1-1 iletişim mümkün mü?", a: "Ders sonrası notlar ve panel mesajlarıyla 1-1 geri bildirim alırsın. Gerekirse ek randevu planlarız." },
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
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
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