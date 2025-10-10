"use client";

import React, { useEffect, useMemo, useState } from "react";

// API'den gelen ödeme kaydı tipi
type Payment = {
  id: string;
  student_package_id: string;
  student_name: string | null;
  parent_name: string | null;
  parent_phone_e164: string | null;
  amount: number;
  method: "kart" | "nakit" | "havale_eft";
  status: "odendi" | "beklemede" | "basarisiz" | "iade";
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  note: string | null;
  package_name: string | null;
};

// Filtre için öğrenci-paket tipi
type StudentPackageFilter = {
  id: string; // student_package_id
  student_name: string;
  package_name?: string | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

// Türkçe label'lar
const STATUS_LABEL: Record<Payment["status"], string> = {
  odendi: "Ödendi",
  beklemede: "Bekliyor",
  basarisiz: "Başarısız",
  iade: "İade",
};
const METHOD_LABEL: Record<Payment["method"], string> = {
  kart: "Kart",
  nakit: "Nakit",
  havale_eft: "Havale/EFT",
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "—");
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");


export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any | null>(null);
  const [studentPackageFilters, setStudentPackageFilters] = useState<StudentPackageFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filtreler için state'ler
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [studentPackageId, setStudentPackageId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // YENİ: Detay modalı için state
  const [detailModalItem, setDetailModalItem] = useState<Payment | null>(null);


  async function fetchStudentPackageFilters() {
    try {
      const res = await fetch("/api/admin/studentpackages/list-for-filter", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const arr = (j.items ?? []).map((x: any) => ({
        id: x.id, student_name: x.student_name ?? "İsimsiz", package_name: x.package_name ?? null,
      })) as StudentPackageFilter[];
      arr.sort((a, b) => a.student_name.localeCompare(b.student_name, "tr"));
      setStudentPackageFilters(arr);
    } catch (e) {
      console.error("Failed to fetch student package filters:", e);
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (method) params.set("method", method);
      if (studentPackageId) params.set("studentPackageId", studentPackageId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const url = `/api/admin/payments/list?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Ödemeler alınamadı");

      setItems(j.items || []);
      setTotal(j.total || 0);
      setSummary(j.summary || null);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStudentPackageFilters(); }, []);
  useEffect(() => { load(); }, [q, status, method, studentPackageId, dateFrom, dateTo, page]);

  // YENİ: Silme Fonksiyonu
  async function removePayment(paymentId: string, studentName: string | null) {
    if (!confirm(`'${studentName || 'İsimsiz'}' adlı öğrencinin bu ödeme kaydını silmek istediğine emin misin? Bu işlem geri alınamaz ve paketi de silecektir!`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/payments/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Silme işlemi başarısız oldu.");
      }

      alert("Kayıt başarıyla silindi.");
      load(); // Liste kendini yenilesin

    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detaylı Ödeme Dökümü</h1>
          <p className="text-sm text-gray-700">Tüm ödeme kalemlerini filtreleyin ve analiz edin.</p>
        </div>
        {/* YENİ ÖDEME BUTONU KALDIRILDI */}
      </div>

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Toplam Hasılat (Filtreli)" value={money(summary?.totalRevenue || 0)} tone="emerald" />
        <Stat label="Ödeme Adedi" value={String(total)} />
        <Stat label="Ödendi" value={String(summary?.countByStatus?.odendi || 0)} tone="emerald" />
        <Stat label="Bekliyor" value={String(summary?.countByStatus?.beklemede || 0)} tone="amber" />
        <Stat label="İade" value={String(summary?.countByStatus?.iade || 0)} tone="indigo" />
      </div>

      {/* Metot Kırılımı */}
      {summary?.methodBreakdown && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Metot Kırılımı</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(summary.methodBreakdown).map(([methodKey, amount]) => (
              <span key={methodKey} className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-medium text-gray-900">
                {METHOD_LABEL[methodKey as keyof typeof METHOD_LABEL]}: <b className="font-semibold">{money(amount as number)}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtre çubuğu */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Ara: öğrenci/veli/not..." className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Durum (hepsi)</option>
            <option value="odendi">Ödendi</option>
            <option value="beklemede">Bekliyor</option>
            <option value="basarisiz">Başarısız</option>
            <option value="iade">İade</option>
          </select>
          <select value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Metot (hepsi)</option>
            <option value="kart">Kart</option>
            <option value="nakit">Nakit</option>
            <option value="havale_eft">Havale/EFT</option>
          </select>
          <select value={studentPackageId} onChange={(e) => { setPage(1); setStudentPackageId(e.target.value); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Öğrenci/Paket (hepsi)</option>
            {studentPackageFilters.map((s) => (<option key={s.id} value={s.id}>{s.student_name}{s.package_name ? ` • ${s.package_name}` : ""}</option>))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-800">
            <tr>
              <th className="px-4 py-3">Ödeme Tarihi</th>
              <th className="px-4 py-3">Öğrenci & Paket</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Metot</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Dönem</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="text-[15px] text-gray-900">
            {loading && <tr><td colSpan={7} className="py-10 text-center">Yükleniyor…</td></tr>}
            {!loading && items.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3 whitespace-nowrap">{fmtDateTime(p.paid_at)}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{p.student_name || "—"}</div>
                  <div className="text-xs text-gray-700">{p.parent_name}</div>
                  <div className="mt-0.5 text-xs text-gray-600">Paket: {p.package_name || "—"}</div>
                </td>
                <td className="px-4 py-3 font-semibold">{money(p.amount || 0)}</td>
                <td className="px-4 py-3"><span className="text-xs">{METHOD_LABEL[p.method]}</span></td>
                <td className="px-4 py-3"><span className="text-xs font-semibold">{STATUS_LABEL[p.status]}</span></td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setDetailModalItem(p)} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">Detay</button>
                    <button onClick={() => removePayment(p.id, p.student_name)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Sil</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="py-10 text-center">Filtreye uygun kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>

       {/* Sayfalama */}
      <div className="flex items-center justify-between text-sm text-gray-700">
        <div>Toplam: <b>{total}</b> kayıt</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">Önceki</button>
          <span>Sayfa {page}/{Math.max(1, Math.ceil(total / pageSize))}</span>
          <button disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">Sonraki</button>
        </div>
      </div>

      {/* YENİ: Detay Modalı */}
      {detailModalItem && (
        <Modal title="Ödeme Detayı" onClose={() => setDetailModalItem(null)}>
            <div className="space-y-2 text-sm">
                <DetailRow label="Öğrenci">{detailModalItem.student_name}</DetailRow>
                <DetailRow label="Veli">{detailModalItem.parent_name} ({detailModalItem.parent_phone_e164})</DetailRow>
                <DetailRow label="Paket">{detailModalItem.package_name}</DetailRow>
                <hr className="my-2"/>
                <DetailRow label="Tutar">{money(detailModalItem.amount)}</DetailRow>
                <DetailRow label="Ödeme Metodu">{METHOD_LABEL[detailModalItem.method]}</DetailRow>
                <DetailRow label="Ödeme Durumu">{STATUS_LABEL[detailModalItem.status]}</DetailRow>
                <DetailRow label="Ödeme Zamanı">{fmtDateTime(detailModalItem.paid_at)}</DetailRow>
                <hr className="my-2"/>
                <DetailRow label="Paket Dönemi">{fmtDate(detailModalItem.period_start)} – {fmtDate(detailModalItem.period_end)}</DetailRow>
                <DetailRow label="Not">{detailModalItem.note || "—"}</DetailRow>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => setDetailModalItem(null)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">Kapat</button>
            </div>
        </Modal>
      )}

    </div>
  );
}

// Lokal Componentler
function Stat({ label, value, tone = "gray" }: { label: string; value: string; tone?: string }) {
  const map: any = {
    gray: "bg-gray-100 text-gray-900", emerald: "bg-emerald-100 text-emerald-900", amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-900", indigo: "bg-indigo-100 text-indigo-900",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-700">{label}</div>
      <div className={`mt-1 inline-flex items-center rounded-lg px-2 py-1 text-xl font-bold ${map[tone]}`}>{value}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void; }) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" aria-modal="true">
        <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50">Kapat</button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    );
}
  
function DetailRow({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-1.5">
            <div className="col-span-1 font-medium text-gray-700">{label}</div>
            <div className="col-span-2 text-gray-900">{children}</div>
        </div>
    )
}