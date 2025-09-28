"use client";

import Image from "next/image";
import { useCallback } from "react";

export default function WhatsappButton() {
  const phone = "905015303949";
  const text = encodeURIComponent("Merhaba, bilgi almak istiyorum 👋");
  const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
  const webUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
    if (isMobile) {
      const fallback = setTimeout(() => { window.location.href = webUrl; }, 700);
      window.location.href = appUrl;
      setTimeout(() => clearTimeout(fallback), 2000);
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  }, [appUrl, webUrl]);

  return (
    <a
      href={webUrl}
      onClick={onClick}
      aria-label="WhatsApp ile yaz"
      className="fixed right-4 md:right-6 z-[100] group"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <span className="sr-only">WhatsApp ile mesaj gönder</span>
      <span
        className="relative inline-flex items-center justify-center rounded-full shadow-[0_12px_40px_rgba(16,185,129,0.45)] ring-1 ring-white/10 bg-[#25D366] hover:bg-[#22c55e] transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{ width: 60, height: 60 }}
      >
        <Image src="/images/wpico.png" alt="" width={34} height={34} className="pointer-events-none" />
      </span>
    </a>
  );
}
