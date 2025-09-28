import "./globals.css";
import Script from "next/script";
import WhatsappButton from "@/components/WhatsappButton";

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
        <WhatsappButton />
      </body>
    </html>
  );
}
