"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Palette, CreditCard, Settings } from "lucide-react";

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-white px-4 py-6">
      <h2 className="mb-8 text-lg font-bold text-gray-800">PaletEvreni Admin</h2>
      <nav className="flex flex-col gap-1">
        <SidebarLink href="/admin/dashboard" icon={BarChart3} label="Dashboard" />
        <SidebarLink href="/admin/trials" icon={BarChart3} label="Tanıtım dersi öğrencileri" />
        <SidebarLink href="/admin/students" icon={FileText} label="Öğrencilerim" />
        <SidebarLink href="/admin/applications" icon={FileText} label="Başvurular" />
        <SidebarLink href="/admin/payments" icon={CreditCard} label="Ödemeler" />
        <SidebarLink href="/admin/settings" icon={Settings} label="Ayarlar" />
      </nav>
    </aside>
  );
}
