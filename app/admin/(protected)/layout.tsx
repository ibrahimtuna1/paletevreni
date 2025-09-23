import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import MotionRoot from "./MotionRoot"; // ← client wrapper

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;

  if (role !== "admin") {
    redirect("/admin/signin");
  }

  return (
    <div className="flex min-h-dvh bg-gray-50 text-gray-900">
      <Sidebar />
      <main className="flex-1 p-6">
        {/* Framer Motion context'i burada, tüm alt sayfalara yayılıyor */}
        <MotionRoot>{children}</MotionRoot>
      </main>
    </div>
  );
}
