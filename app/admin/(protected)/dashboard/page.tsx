// app/admin/(protected)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: number;
  applications: number;
  courses: number;
  payments: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    applications: 0,
    courses: 0,
    payments: 0,
  });

  // örnek veri yükleme (ileride supabase fetch ile değiştir)
  useEffect(() => {
    setTimeout(() => {
      setStats({
        users: 124,
        applications: 32,
        courses: 7,
        payments: 58,
      });
    }, 500);
  }, []);

  return (
    <div className="space-y-8">
      {/* başlık */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-sm text-gray-600">
          Genel istatistikleri ve son aktiviteleri buradan görebilirsiniz.
        </p>
      </header>

      {/* hızlı istatistik kartları */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Toplam Kullanıcı" value={stats.users} color="from-indigo-500 to-indigo-700" />
        <Card title="Başvurular" value={stats.applications} color="from-emerald-500 to-emerald-700" />
        <Card title="Kurslar" value={stats.courses} color="from-purple-500 to-purple-700" />
        <Card title="Ödemeler" value={stats.payments} color="from-pink-500 to-pink-700" />
      </section>

      {/* son başvurular (örnek tablo) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Son Başvurular</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Öğrenci</th>
                <th className="px-4 py-2 text-left">Veli</th>
                <th className="px-4 py-2 text-left">Yaş</th>
                <th className="px-4 py-2 text-left">Durum</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Ayşe Yılmaz</td>
                <td className="px-4 py-2">Mehmet Yılmaz</td>
                <td className="px-4 py-2">10</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                    Beklemede
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Ahmet Kaya</td>
                <td className="px-4 py-2">Fatma Kaya</td>
                <td className="px-4 py-2">11</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                    Onaylandı
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Zeynep Demir</td>
                <td className="px-4 py-2">Ali Demir</td>
                <td className="px-4 py-2">9</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-800">
                    Reddedildi
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-r ${color} p-6 text-white shadow`}
    >
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
