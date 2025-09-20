// app/page.tsx  (SERVER; en tepede "use client" YOK)
import { Suspense } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Sections from "./blocks/Sections";

export default function Page() {
  return (
    <main>
      {/* Eğer bu alt bileşenler hook kullanıyorsa, kendi dosyalarında "use client" olsun.
         useSearchParams/usePathname gibi şeyler varsa ayrıca Suspense'e alıyoruz. */}
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <Hero />

      <Sections />

      <Footer />
    </main>
  );
}
