// app/admin/(protected)/payments/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/** Ödeme kaydı: student_id yok; student_package_id var */
type Payment = {
  id: string;
  student_package_id: string;
  student_name: string | null;        // backend join ile
  parent_name: string | null;         // backend join ile
  parent_phone_e164: string | null;   // backend join ile
  amount: number;
  method: "card" | "cash" | "transfer";
  status: "paid" | "pending" | "failed" | "refunded";
  paid_at: string | null;      // ISO veya null
  period_start: string | null; // ISO (date)
  period_end: string | null;   // ISO (date)
  note: string | null;
};

/** Filtre select'i için: öğrenci paketi (id=student_package_id) */
type Student = {
  id: string; // student_package_id
  student_name: string;
  package_name?: string | null;
  student_id?: string | null;
  valid_weeks?: number | null;
  sessions_total?: number | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

// --- Türkçe label'lar ---
const STATUS_LABEL: Record<Payment["status"], string> = {
  paid: "Ödendi",
  pending: "Bekliyor",
  failed: "Başarısız",
  refunded: "İade",
};
const METHOD_LABEL: Record<Payment["method"], string> = {
  card: "Kart",
  cash: "Nakit",
  transfer: "Havale/EFT",
};

// ---- yardımcılar ----
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "—");

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalRevenue: number; countByStatus: any; methodBreakdown: any } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // paket/öğrenci lookup
  const [pkgNameBySpId, setPkgNameBySpId] = useState<Record<string, string>>({});
  const [weeksBySpId, setWeeksBySpId] = useState<Record<string, number>>({});

  // filtreler
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [studentPackageId, setStudentPackageId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // DÜZENLE modalı
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<{ student_name: string; package_name?: string|null; student_package_id?: string|null } | null>(null);
  const [form, setForm] = useState<any>({
    student_package_id: "",
    amount: "",
    method: "card",
    status: "pending",
    paid_at: "",
    period_start: "",
    period_end: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  // Son ders hesabı (paket hafta sayısına göre)
  const calcRegisterEnd = (p: Payment): Date | null => {
    if (p.period_end) return new Date(p.period_end);
    if (!p.period_start) return null;
    const weeks = weeksBySpId[p.student_package_id] || 4; // fallback 4 hafta
    const start = new Date(p.period_start);
    start.setDate(start.getDate() + (weeks * 7) - 1);
    return start;
  };

  function openEdit(p: Payment) {
    setEditing(p);
    setPicked({
      student_name: p.student_name || "—",
      package_name: pkgNameBySpId[p.student_package_id] || null,
      student_package_id: p.student_package_id,
    });
    setForm({
      student_package_id: p.student_package_id,
      amount: String(p.amount ?? ""),
      method: p.method,
      status: p.status,
      paid_at: p.paid_at ? p.paid_at.slice(0, 10) : "",
      period_start: p.period_start || "",
      period_end: p.period_end || "",
      note: p.note || "",
    });
    setModalOpen(true);
  }

  /** Filtre select'i için: öğrenci paketlerini getir */
  async function fetchStudents() {
    const res = await fetch("/api/admin/studentpackages/list", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const arr = (j.items ?? []).map((x: any) => ({
      id: x.id, // student_package_id
      student_name: x.student_name ?? "İsimsiz",
      package_name: x.package_name ?? null,
      student_id: x.student_id ?? null,
      valid_weeks: typeof x.valid_weeks === "number" ? x.valid_weeks : null,
      sessions_total: typeof x.sessions_total === "number" ? x.sessions_total : null,
    })) as Student[];

    arr.sort((a, b) => a.student_name.localeCompare(b.student_name, "tr"));
    setStudents(arr);

    // lookup map'ler
    const nameMap: Record<string, string> = {};
    const weekMap: Record<string, number> = {};
    for (const s of arr) {
      if (s.id && s.package_name) nameMap[s.id] = s.package_name;
      const w = (s.valid_weeks && s.valid_weeks > 0 ? s.valid_weeks : (s.sessions_total && s.sessions_total > 0 ? s.sessions_total : 4));
      if (s.id) weekMap[s.id] = w;
    }
    setPkgNameBySpId(nameMap);
    setWeeksBySpId(weekMap);
  }

  /** Ödemeleri getir (filtreler ile) */
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

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { load(); }, [q, status, method, studentPackageId, dateFrom, dateTo, page]);

  /** SADECE UPDATE */
  async function save() {
    if (!editing) return alert("Düzenlenecek kayıt yok.");
    if (!form.student_package_id) return alert("Öğrenci/paket zorunlu.");
    if (!form.amount) return alert("Tutar zorunlu");

    setBusy(true);
    const payload = {
      student_package_id: form.student_package_id,
      amount: Number(form.amount),
      method: form.method,
      status: form.status,
      paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      note: form.note || null,
    };

    let res = await fetch("/api/admin/payments/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...payload }),
    });

    if (!res.ok) {
      // fallback: POST /update
      res = await fetch("/api/admin/payments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
    }

    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j?.error || "Kaydedilemedi");
    setModalOpen(false);
    await load();
  }

  /** Sil */
  async function remove(id: string) {
    if (!confirm("Ödemeyi silmek istiyor musun?")) return;

    let res = await fetch("/api/admin/payments/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      res = await fetch(`/api/admin/payments/delete?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    }
    const raw = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(raw);
        return alert(j?.error || raw);
      } catch {
        return alert(raw);
      }
    }
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
          <p className="text-sm text-gray-700">Sadece ödeme kalemleri. Kayıt/yenileme işleri ayrı ekranda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Yenile
          </button>
          <Link
            href="/admin/payments/new"
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Yeni Ödeme
          </Link>
        </div>
      </div>

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Toplam Hasılat (filtre)" value={money(summary?.totalRevenue || 0)} tone="emerald" />
        <Stat label="Ödeme Adedi" value={String(total)} />
        <Stat label="Ödendi" value={String(summary?.countByStatus?.paid || 0)} tone="emerald" />
        <Stat label="Bekliyor" value={String(summary?.countByStatus?.pending || 0)} tone="amber" />
        <Stat label="İade" value={String(summary?.countByStatus?.refunded || 0)} tone="indigo" />
      </div>

      {/* Metot Kırılımı */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Metot Kırılımı (ödemeler)</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["card", "cash", "transfer"] as Payment["method"][]).map((m) => (
            <span
              key={m}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-medium text-gray-900"
            >
              {METHOD_LABEL[m]}: <b className="font-semibold">{money(summary?.methodBreakdown?.[m] || 0)}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Filtre çubuğu */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Ara: öğrenci/veli/telefon/not..."
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black/20"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
          >
            <option value="">Durum (hepsi)</option>
            <option value="paid">Ödendi</option>
            <option value="pending">Bekliyor</option>
            <option value="failed">Başarısız</option>
            <option value="refunded">İade</option>
          </select>

          <select
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
          >
            <option value="">Metot (hepsi)</option>
            <option value="card">Kart</option>
            <option value="cash">Nakit</option>
            <option value="transfer">Havale/EFT</option>
          </select>

          <select
            value={studentPackageId}
            onChange={(e) => {
              setPage(1);
              setStudentPackageId(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
          >
            <option value="">Öğrenci/Paket (hepsi)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_name}{s.package_name ? ` • ${s.package_name}` : ""}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-800">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Öğrenci</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Metot</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İlk–Son Ders</th>
              <th className="px-4 py-3">Not</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="text-[15px] text-gray-900">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-700">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => {
                const end = calcRegisterEnd(p);
                return (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{p.paid_at ? new Date(p.paid_at).toLocaleString("tr-TR") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.student_name || "—"}</div>
                      <div className="text-xs text-gray-700">
                        {p.parent_name} • {p.parent_phone_e164}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600">
                        Paket: {pkgNameBySpId[p.student_package_id] || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{money(Number(p.amount || 0))}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                        {METHOD_LABEL[p.method]}
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
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fmtDate(p.period_start)} – {end ? end.toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-3">{p.note || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-700">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      <div className="flex items-center justify-between text-sm text-gray-700">
        <div>
          Toplam: <b>{total}</b> kayıt
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 disabled:opacity-50"
          >
            Önceki
          </button>
          <span>
            Sayfa {page}/{Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>

      {/* Düzenleme Modalı */}
      {modalOpen && (
        <Modal title={"Ödeme Düzenle"} onClose={() => setModalOpen(false)}>
          <div className="space-y-3 text-gray-900">
            <Row label="Öğrenci *">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={
                    picked
                      ? `${picked.student_name}${picked.package_name ? " • " + picked.package_name : ""}`
                      : ""
                  }
                  placeholder="Öğrenci seçin…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={() => setPickerOpen(true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                >
                  Seç
                </button>
              </div>
              {picked && !picked.student_package_id && (
                <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Bu öğrenciye bağlı paket bulunamadı. Önce paket atayın ya da öğrenci için paket oluşturun.
                </div>
              )}
            </Row>
            <Row label="Tutar *">
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f: any) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </Row>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Metot *">
                <select
                  value={form.method}
                  onChange={(e) => setForm((f: any) => ({ ...f, method: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="card">Kart</option>
                  <option value="cash">Nakit</option>
                  <option value="transfer">Havale/EFT</option>
                </select>
              </Row>
              <Row label="Durum *">
                <select
                  value={form.status}
                  onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="paid">Ödendi</option>
                  <option value="pending">Bekliyor</option>
                  <option value="failed">Başarısız</option>
                  <option value="refunded">İade</option>
                </select>
              </Row>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Row label="Ödeme Tarihi (gerçekleştiyse)">
                <input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm((f: any) => ({ ...f, paid_at: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </Row>
              <Row label="Dönem Başlangıç">
                <input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm((f: any) => ({ ...f, period_start: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </Row>
              <Row label="Dönem Bitiş">
                <input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm((f: any) => ({ ...f, period_end: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </Row>
            </div>
            <Row label="Not">
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </Row>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              İptal
            </button>
            <button
              disabled={busy || !form.student_package_id}
              onClick={save}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </Modal>
      )}

      {/* Öğrenci seçici mini modalı (edit içinde lazım) */}
      {pickerOpen && (
        <StudentPicker
          onClose={() => setPickerOpen(false)}
          onPick={(x: any) => {
            setPicked({
              student_name: x.student_name,
              package_name: x.package_name,
              student_package_id: x.student_package_id,
            });
            setForm((f: any) => ({ ...f, student_package_id: x.student_package_id || "" }));
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string;
  tone?: "gray" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const map: any = {
    gray: "bg-gray-100 text-gray-900",
    emerald: "bg-emerald-100 text-emerald-900",
    amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-900",
    indigo: "bg-indigo-100 text-indigo-900",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-700">{label}</div>
      <div className={`mt-1 inline-flex items-center rounded-lg px-2 py-1 text-xl font-bold ${map[tone]}`}>{value}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
        <div className="text-gray-900">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, children }: any) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="mt-1 text-gray-900 [&_input]:text-gray-900 [&_select]:text-gray-900 [&_textarea]:text-gray-900 [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-gray-400">
        {children}
      </div>
    </div>
  );
}

/** Öğrenci seçici – studentpackages/list’ten çeker */
function StudentPicker({ onClose, onPick }: { onClose: () => void; onPick: (x: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(
      `/api/admin/studentpackages/list?q=${encodeURIComponent(q)}`,
      { cache: "no-store" }
    );
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return alert(j?.error || "Öğrenciler alınamadı");

    // butonun disable olmaması için student_package_id alanını garantiye al
    const rows = (j.items || []).map((x: any) => ({
      ...x,
      student_package_id: x.student_package_id || x.id, // id zaten student_package_id
    }));
    setItems(rows);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Öğrenci Seç</h3>
          <button onClick={onClose} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50">
            Kapat
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim ara…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <button onClick={load} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50">
            Ara
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-800">
              <tr>
                <th className="px-3 py-2">Öğrenci</th>
                <th className="px-3 py-2">Veli</th>
                <th className="px-3 py-2">Paket</th>
                <th className="px-3 py-2">Seç</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-700">Yükleniyor…</td></tr>
              )}
              {!loading && items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{x.student_name}</td>
                  <td className="px-3 py-2">{x.parent_name} • {x.parent_phone_e164}</td>
                  <td className="px-3 py-2">{x.package_name || <span className="text-gray-500">Paket yok</span>}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onPick(x)}
                      className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                      disabled={!x.student_package_id} // paket yoksa seçtirmiyoruz
                    >
                      Seç
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-700">Öğrenci yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}