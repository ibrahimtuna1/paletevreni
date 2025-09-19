// app/auth/page.tsx
import AuthPageClient from "./AuthPageClient";

export const metadata = {
  title: "Giriş / Kayıt | Palet Evreni",
  description: "Öğrenci ve öğretmen paneline giriş / kayıt.",
};

export default function AuthPage() {
  return (
    <main className="min-h-[92vh]">
      <AuthPageClient />
    </main>
  );
}
