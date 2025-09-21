// app/page.tsx  (SERVER component)
import { Suspense } from "react";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Sections from "./blocks/Sections";

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
