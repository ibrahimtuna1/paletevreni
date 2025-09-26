// app/page.tsx  (SERVER component)
import { Suspense } from "react";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Sections from "./blocks/Sections";

export const metadata = {
  title: "PaletEvreni – Online Resim Dersi ve Çizim Eğitimi",
  description:
    "PaletEvreni’de online resim dersleriyle çizim ve boyama becerilerinizi geliştirin. Birebir veya grup dersleri, canlı eğitim ve kolay kayıt.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PaletEvreni – Online Resim Dersi ve Çizim Eğitimi",
    description:
      "Online çizim ve boyama dersleri. Canlı atölyeler, gelişim takibi ve kolay kayıt.",
    url: "https://paletevreni.com/",
    siteName: "PaletEvreni",
    type: "website",
    images: [{ url: "/images/home-og.jpg", width: 1200, height: 630, alt: "PaletEvreni" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PaletEvreni – Online Resim Dersi ve Çizim Eğitimi",
    description:
      "Canlı online resim dersleriyle adım adım çizim öğrenin. Birebir/grup seçenekleri.",
    images: ["/images/home-og.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <main>
      {/* Header artık Hero'nun içinde */}
      <Hero />

      {/* Sections "use client" ise Suspense güvenlidir */}
      <Suspense fallback={null}>
        <Sections />
      </Suspense>

      <Footer />
    </main>
  );
}
