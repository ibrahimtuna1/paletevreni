// app/page.tsx  (SERVER component)
import { Suspense } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Sections from "./blocks/Sections";

export default function Page() {
  return (
    <main>
      {/* Header client bileşense güvenli olması için Suspense ile sarıyoruz */}
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      {/* Hero client ama Suspense şart değil; istersen sarabilirsin */}
      <Hero />

      {/* Sections "use client" olduğu için Suspense ile sarmak iyi pratik */}
      <Suspense fallback={null}>
        <Sections />
      </Suspense>

      <Footer />
    </main>
  );
}
