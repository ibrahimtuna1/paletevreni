// app/basvuru/layout.tsx
export const metadata = {
  title: "Ücretsiz Tanışma Dersi Başvurusu | PaletEvreni",
  description:
    "Ücretsiz tanışma dersi için başvurun. Kısa formu doldurun, uygun saat için sizi arayalım. Online resim kursu bilgilendirmeleri SMS ile yapılır.",
  alternates: { canonical: "/basvuru" },
  robots: { index: true, follow: true },
};

export default function BasvuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
