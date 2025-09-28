// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import Image from "next/image";

export const metadata = {
  title: "PaletEvreni – Online Resim Kursu",
  description: "Öğrenci ve öğretmenler için canlı atölye ve panel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-786530047" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-786530047');
          `}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-gradient-to-br from-[#0f1020] via-[#131a3a] to-[#201040] text-white antialiased font-sans font-medium tracking-tight"
      >
        {children}

        <a
          href="https://wa.me/905015303949?text=Merhaba%2C%20bilgi%20almak%20istiyorum%20%F0%9F%91%8B"
          aria-label="WhatsApp'tan yaz"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-4 md:right-6 z-[100] group"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <span className="sr-only">WhatsApp ile mesaj gönder</span>
          <span
            className="relative inline-flex items-center justify-center rounded-full shadow-[0_12px_40px_rgba(16,185,129,0.45)] ring-1 ring-white/10 bg-[#25D366] hover:bg-[#22c55e] transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{ width: 60, height: 60 }}
          >
            <Image src="/images/wpico.png" alt="" width={34} height={34} className="pointer-events-none" />
            <span
              className="absolute -right-1 -top-1 rounded-full bg-white/70"
              style={{ width: 10, height: 10 }}
            />
          </span>
        </a>
      </body>
    </html>
  );
}
