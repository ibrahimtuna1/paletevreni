// app/admin/(protected)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

type Summary = {
  students_total: number;
  students_active: number;
  classes_total: number;
  payments_count_30d: number;
  revenue_30d: number; // TRY
};

type RecentPayment = {
  id: string;
  paid_at: string;
  amount: number;
  method: "card" | "cash" | "transfer";
  status: "paid" | "pending" | "failed" | "refunded";
  student_name: string | null;
  parent_name: string | null;
};

type RecentStudent = {
  id: string;
  student_name: string;
  parent_name: string | null;
  created_at: string;
  status: "active" | "paused" | "left";
};

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n || 0);

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    students_total: 0,
    students_active: 0,
    classes_total: 0,
    payments_count_30d: 0,
    revenue_30d: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [sRes, rRes] = await Promise.all([
          fetch("/api/admin/dashboard/summary", { cache: "no-store" }),
          fetch("/api/admin/dashboard/recent", { cache: "no-store" }),
        ]);
        const sJson = await sRes.json();
        const rJson = await rRes.json();
        if (!sRes.ok) throw new Error(sJson?.error || "Özet alınamadı");
        if (!rRes.ok) throw new Error(rJson?.error || "Son kayıtlar alınamadı");
        setSummary(sJson as Summary);
        setRecentPayments(rJson.payments || []);
        setRecentStudents(rJson.students || []);
      } catch (e: any) {
        setErr(e?.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    })();
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

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
          {err}
        </div>
      )}

      {/* hızlı istatistik kartları */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Toplam Öğrenci" value={summary.students_total} color="from-indigo-500 to-indigo-700" />
        <Card title="Aktif Öğrenci" value={summary.students_active} color="from-emerald-500 to-emerald-700" />
        <Card title="Sınıf Sayısı" value={summary.classes_total} color="from-purple-500 to-purple-700" />
        <Card title="Son 30 Gün Hasılat" value={money(summary.revenue_30d)} color="from-pink-500 to-pink-700" isMoney />
        <Card title="Son 30 Gün Ödeme" value={summary.payments_count_30d} color="from-amber-500 to-amber-700" />
      </section>

      {/* Son Ödemeler */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Son Ödemeler</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-800">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Öğrenci</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Metot</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody className="text-[15px] text-gray-900">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-700">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading &&
                recentPayments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{new Date(p.paid_at).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.student_name || "—"}</div>
                      <div className="text-xs text-gray-700">{p.parent_name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                        {p.method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "paid"
                            ? "bg-emerald-100 text-emerald-900"
                            : p.status === "pending"
                            ? "bg-amber-100 text-amber-900"
                            : p.status === "refunded"
                            ? "bg-indigo-100 text-indigo-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              {!loading && recentPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-700">
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Son Öğrenciler */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Son Eklenen Öğrenciler</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-800">
              <tr>
                <th className="px-4 py-3">Öğrenci</th>
                <th className="px-4 py-3">Veli</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody className="text-[15px] text-gray-900">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-700">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading &&
                recentStudents.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">{s.student_name}</td>
                    <td className="px-4 py-3">{s.parent_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === "active"
                            ? "bg-emerald-100 text-emerald-900"
                            : s.status === "paused"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {s.status === "active"
                          ? "Aktif"
                          : s.status === "paused"
                          ? "Askıda"
                          : "Ayrıldı"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(s.created_at).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              {!loading && recentStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-700">
                    Kayıt yok.
                  </td>
                </tr>
              )}
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
  isMoney,
}: {
  title: string;
  value: number | string;
  color: string;
  isMoney?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-r ${color} p-6 text-white shadow`}>
      <p className="text-sm/5 opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
