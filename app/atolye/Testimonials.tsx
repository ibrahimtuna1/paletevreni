// app/atolye/Testimonials.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";

export default function Testimonials() {
  const ref = useRef<HTMLDivElement | null>(null);

  const items = [
    { name: "Ayşe K.",   date: "13 Temmuz 2024", text: "Palet Evreni’ne başladıktan sonra resim yapmaya daha fazla odaklanıyor. Dersten sonra ‘ben yapabilirim’ demesi bile büyük değişim. Eğitmenlerin yaklaşımı harika.", stars: 5 },
    { name: "Mehmet T.", date: "11 Haziran 2024", text: "Online ders akışının net olması bizi çok rahatlattı. Kızım her hafta yeni bir teknik öğreniyor, evde de deniyor. Dosyalama ödevleri sayesinde çizimleri düzenli birikiyor.",      stars: 5 },
    { name: "Zeynep A.", date: "02 Ekim 2024",   text: "Kurs sonrası fark ettiğimiz en büyük şey sabır. Bir resmi acele bitirmek yerine katman katman ilerlemeyi öğrendi. Bu, okul ödevlerine bile yansıdı.",                 stars: 4 },
    { name: "Baran Y.",  date: "28 Mayıs 2024",  text: "Çocuklar için küçük bir sanat kulübü gibi. Her derste birbirlerinin işine saygı duymayı, yorum yapmayı öğreniyorlar.Oğlum etkinlikleri kendi başına yapmaya başladı. Rozet sistemi aşırı motive ediyor.",         stars: 5 },
    { name: "Selin D.",  date: "19 Mart 2024",   text: "Artık çizim masasına kendi kendine oturuyor. Eskiden ‘yapamam’ derdi, şimdi ‘bir deneyeyim’ diyor. Eğitmenlerin sakin anlatımı bizde çok fark yarattı",                       stars: 5 },
    { name: "Erdem K.",  date: "07 Nisan 2024",  text: "‘Ben de sanatçıyım’ cümlesini ilk kez duyduk. Küçük bir cümle, büyük bir değişim. Palet Evreni bu kapıyı nazikçe açtı.",                       stars: 4 },
  ];

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.min(520, el.clientWidth * 0.9);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const StarRow = ({ n }: { n: number }) => (
    <div className="text-[15px] leading-none">
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(5 - n)}</span>
    </div>
  );

  return (
    <section className="border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Başlık banner görseli */}
        <div className="mb-6 text-center">
          <Image
            src="/images/veli-banner.png"
            alt="Velilerimizin Memnuniyeti"
            width={1329}
            height={172}
            className="mx-auto h-auto w-full max-w-[980px]"
            sizes="(min-width:1024px) 980px, 90vw"
            priority
          />
        </div>

        {/* Oklar */}
        <div className="mb-4 flex justify-center gap-2 md:justify-end">
          <button
            onClick={() => scroll(-1)}
            aria-label="Geri"
            className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ←
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="İleri"
            className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            →
          </button>
        </div>

        {/* Kaydırmalı hat */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />

          <style>{`
            .hide-scrollbar::-webkit-scrollbar{ display:none }
            .hide-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
          `}</style>

          <div
            ref={ref}
            className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
          >
            {items.map((it, i) => (
              <article
                key={i}
                className="min-w-[280px] snap-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:min-w-[380px] md:min-w-[460px]"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-fuchsia-100 text-sm font-bold text-fuchsia-700">
                    {it.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-slate-500">{it.date}</div>
                  </div>
                </div>

                <StarRow n={it.stars} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
                  {it.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
