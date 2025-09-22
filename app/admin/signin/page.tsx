import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SigninClient } from "./signinClient";

export default async function SigninPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("admin_session")?.value;

  // admin zaten login ise signin'e girmesin
  if (role === "admin") {
    redirect("/admin"); // bu da /admin/(protected)/dashboard'a gidecek
  }

  return <SigninClient />;
}
