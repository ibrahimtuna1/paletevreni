// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaletEvreni – Online Resim Kursu",
  description: "Öğrenci ve öğretmenler için canlı atölye ve panel.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1020",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" dir="ltr">
      {/* Next, <head> içerisine metadata’yı kendi basar; yine de head etiketi koymak iyi pratik. */}
      <head />
      {/* suppressHydrationWarning: prod’da ufak farklılıkları tolere eder (ör. tarih, hash vs.) */}
      <body
        suppressHydrationWarning
        className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#131a3a] to-[#201040] text-white antialiased font-sans font-medium tracking-tight"
        // CSS hiç yüklenmese bile boş sayfa hissi olmasın diye minimal inline fallback:
        style={{ background: "linear-gradient(135deg,#0f1020,#131a3a 60%,#201040)", color: "#fff" }}
      >
        {/* NoScript: JS kapalıysa kullanıcı boş görmesin */}
        <noscript>
          <div style={{ padding: 16, background: "#111827", color: "#fff" }}>
            Bu site JavaScript gerektirir. Lütfen tarayıcınızda JavaScript’i etkinleştirin.
          </div>
        </noscript>

        {/* İçerik */}
        {children}
      </body>
    </html>
  );
}
