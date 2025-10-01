// components/PublicOnlyWhatsApp.tsx
"use client";

import { usePathname } from "next/navigation";
import WhatsappButton from "@/components/WhatsappButton";

export default function PublicOnlyWhatsApp() {
  const pathname = usePathname() ?? "";
  // admin ve altındaki tüm rotalarda gizle (signin dahil)
  if (pathname.startsWith("/admin")) return null;
  return <WhatsappButton />;
}
