// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "PaletEvreni – Online Resim Kursu",
  description: "Öğrenci ve öğretmenler için canlı atölye ve panel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#131a3a] to-[#201040] text-white antialiased font-sans font-medium tracking-tight">
        {children}
      </body>
    </html>
  );
}
