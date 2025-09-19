// app/page.tsx
"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Sections from "./blocks/Sections";


export default function Page() {
  return (
    <main>
      <Header />
      <Hero />
      <Sections />
      <Footer />
    </main>
  );
}
