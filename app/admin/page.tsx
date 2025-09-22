import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const c = await cookies();
  const role = c.get("admin_session")?.value;

  if (role !== "admin") {
    redirect("/admin/signin");
  }

  redirect("/admin/dashboard");
}
