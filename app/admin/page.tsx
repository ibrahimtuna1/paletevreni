"use client";

import { useMemo, useState } from "react";

// --- Tipler
type Tab = "dashboard" | "applications" | "payments" | "courses" | "settings";

type Application = {
  id: string;
  parentName: string;
  parentPhone: string;
  childName: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
};

type Payment = {
  id: string;
  payer: string;
  amount: number; // TL
  createdAt: string;
  status: "success" | "failed" | "pending";
};

// --- Yardımcılar
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");

  // fake veriler (supabase bağlayınca burayı fetch ile değiştiririz)
  const applications = useMemo<Application[]>(
    () => [
      { id: "A-1001", parentName: "Zehra Aksoy", parentPhone: "05xx xxx xx xx", childName: "Eymen", createdAt: "2025-09-18 14:22", status: "pending" },
      { id: "A-1002", parentName: "Mehmet Kaya", parentPhone: "05xx xxx xx xx", childName: "Defne", createdAt: "2025-09-19 10:03", status: "approved" },
      { id: "A-1003", parentName: "Elif K.", parentPhone: "05xx xxx xx xx", childName: "Uras", createdAt: "2025-09-19 16:40", status: "rejected" },
    ],
    []
  );

  const payments = useMemo<Payment[]>(
    () => [
      { id: "P-23001", payer: "Zehra Aksoy", amount: 1499, createdAt: "2025-09-18 15:02", status: "success" },
      { id: "P-23002", payer: "Mehmet Kaya", amount: 1499, createdAt: "2025-09-19 10:10", status: "pending" },
      { id: "P-23003", payer: "Elif K.", amount: 1499, createdAt: "2025-09-19 16:42", status: "failed" },
    ],
    []
  );

  // özet sayıları
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;
  const paidSum = payments.filter(p => p.status === "success").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-3 md:static">
        <div className="px-2 py-3">
          <div className="mb-4 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            PaletEvreni • Admin
          </div>

          <nav className="space-y-1">
            <button
              className={linkCls(tab === "dashboard")}
              onClick={() => setTab("dashboard")}
            >
              Panel
            </button>
            <button
              className={linkCls(tab === "applications")}
              onClick={() => setTab("applications")}
            >
              Başvurular
            </button>
            <button
              className={linkCls(tab === "payments")}
              onClick={() => setTab("payments")}
            >
              Ödemeler
            </button>
            <button
              className={linkCls(tab === "courses")}
              onClick={() => setTab("courses")}
            >
              Kurslar
            </button>
            <button
              className={linkCls(tab === "settings")}
              onClick={() => setTab("settings")}
            >
              Ayarlar
            </button>
          </nav>
        </div>

        <div className="absolute bottom-3 left-0 right-0 px-3">
          <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
            <div className="font-semibold">Durum</div>
            <div>Manuel mod aktif • Otomasyon kapalı</div>
          </div>
        </div>
      </aside>

      {/* İçerik */}
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <div className="text-sm font-semibold tracking-tight text-slate-900">
              {tabTitle(tab)}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-600 md:inline">v0.1 • Dev</span>
              <button className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50">
                Çıkış
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4">
          {tab === "dashboard" && (
            <section className="space-y-6">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Genel Bakış</h1>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Bekleyen Başvuru" value={String(pendingCount)} />
                <StatCard title="Onaylanan Başvuru" value={String(approvedCount)} />
                <StatCard title="Reddedilen" value={String(rejectedCount)} />
                <StatCard title="Toplam Tahsilat (₺)" value={toTL(paidSum)} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                Hoş geldin! Soldaki menüden modüllere geçip her şeyi <b>manuel</b> düzenleyebilirsin.
                Sonra bu ekranları route bazlı sayfalara böleriz.
              </div>
            </section>
          )}

          {tab === "applications" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Başvurular</h1>
                <div className="text-sm text-slate-600">
                  Toplam: {applications.length} • Bekleyen: {pendingCount}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Veli</th>
                      <th className="px-4 py-3">Telefon</th>
                      <th className="px-4 py-3">Çocuk</th>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{a.id}</td>
                        <td className="px-4 py-3">{a.parentName}</td>
                        <td className="px-4 py-3">{a.parentPhone}</td>
                        <td className="px-4 py-3">{a.childName}</td>
                        <td className="px-4 py-3 text-slate-600">{a.createdAt}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                              a.status === "approved" && "bg-emerald-100 text-emerald-700",
                              a.status === "pending" && "bg-amber-100 text-amber-700",
                              a.status === "rejected" && "bg-rose-100 text-rose-700"
                            )}
                          >
                            {statusLabel(a.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                              Onayla
                            </button>
                            <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                              Reddet
                            </button>
                            <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                              Düzenle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                Not: Supabase bağlayınca bu butonlara <code>update</code> ve <code>delete</code> işlemlerini koyarız.
              </p>
            </section>
          )}

          {tab === "payments" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Ödemeler</h1>
                <div className="text-sm text-slate-600">
                  Başarılı Tahsilat: ₺{toTL(paidSum)}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Ödeyen</th>
                      <th className="px-4 py-3">Tutar</th>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.id}</td>
                        <td className="px-4 py-3">{p.payer}</td>
                        <td className="px-4 py-3">₺{toTL(p.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{p.createdAt}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                              p.status === "success" && "bg-emerald-100 text-emerald-700",
                              p.status === "pending" && "bg-amber-100 text-amber-700",
                              p.status === "failed" && "bg-rose-100 text-rose-700"
                            )}
                          >
                            {paymentLabel(p.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                              Düzenle
                            </button>
                            <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "courses" && (
            <section className="space-y-4">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Kurslar</h1>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Kurs oluşturma, ders takvimi ve kontenjan yönetimini buraya ekleriz.
                (Supabase: <code>courses</code>, <code>course_sessions</code> tabloları)
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="space-y-4">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Ayarlar</h1>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold">Genel Bilgiler</div>
                  <div className="mt-3 grid gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Kurum Adı</span>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400" defaultValue="Palet Evreni" />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Bildirim E-postası</span>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400" defaultValue="admin@paletevreni.com" />
                    </label>
                  </div>
                  <div className="mt-4">
                    <button className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      Kaydet
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold">Ödeme Ayarları</div>
                  <div className="mt-3 grid gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Ödeme Sağlayıcı</span>
                      <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400">
                        <option>Manuel</option>
                        <option>iyzico</option>
                        <option>Stripe</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Para Birimi</span>
                      <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400" defaultValue="TRY">
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button className="rounded-md border border-slate-200 px-3.5 py-2 text-sm hover:bg-slate-50">
                      Test Ödemesi Gönder
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Alt bileşenler
function linkCls(active: boolean) {
  return cn(
    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition",
    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
  );
}

function tabTitle(tab: Tab) {
  switch (tab) {
    case "dashboard":
      return "Panel";
    case "applications":
      return "Başvurular";
    case "payments":
      return "Ödemeler";
    case "courses":
      return "Kurslar";
    case "settings":
      return "Ayarlar";
    default:
      return "Panel";
  }
}


function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function statusLabel(s: Application["status"]) {
  if (s === "approved") return "Onaylandı";
  if (s === "pending") return "Bekliyor";
  return "Reddedildi";
}

function paymentLabel(s: Payment["status"]) {
  if (s === "success") return "Başarılı";
  if (s === "pending") return "Bekliyor";
  return "Başarısız";
}

function toTL(v: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(v);
}
