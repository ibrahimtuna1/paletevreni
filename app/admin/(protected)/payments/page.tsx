// app/admin/(protected)/payments/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
  paid_at: string;            // ISO
  period_start: string | null; // ISO (date) – postpaid senaryosu için
  period_end: string | null;   // ISO (date) – postpaid ise ödeme günü
  note: string | null;
};

/** Seçim için: öğrenci paketi (id = student_package_id) */
type Student = { id: string; student_name: string; package_name?: string | null };

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

// ---- yardımcılar (yaklaşan ödeme hesabı) ----
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

/** MVP: 1 aylık paket = 30 gün varsayımı.
 *  postpaid ise period_end ödeme günü kabul edilir. prepaid ise paid_at + 30.
 */
function calcNextDue(p: Payment): Date | null {
  const MONTH_DAYS = 30;
  if (p.period_end) return new Date(p.period_end);
  if (p.paid_at) return addDays(new Date(p.paid_at), MONTH_DAYS);
  return null;
}

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalRevenue: number; countByStatus: any; methodBreakdown: any } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtreler
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [studentId, setStudentId] = useState<string>(""); // burada id = student_package_id
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // modal (oluştur/düzenle)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<any>({
    student_package_id: "",
    amount: "",
    method: "card",
    status: "paid",
    paid_at: "",
    period_start: "",
    period_end: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({
      student_package_id: "",
      amount: "",
      method: "card",
      status: "paid",
      paid_at: new Date().toISOString().slice(0, 10),
      period_start: "",
      period_end: "",
      note: "",
    });
    setModalOpen(true);
  }
  function openEdit(p: Payment) {
    setEditing(p);
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

  /** Öğrenci paketlerini getir (select için) */
  async function fetchStudents() {
    // Bu endpoint: id=student_package_id, student_name (+ opsiyonel package_name) döndürmeli
    const res = await fetch("/api/admin/student-packages/list", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      const arr = (j.items ?? []).map((x: any) => ({
        id: x.id, // student_package_id
        student_name: x.student_name ?? "İsimsiz",
        package_name: x.package_name ?? null,
      })) as Student[];
      arr.sort((a, b) => a.student_name.localeCompare(b.student_name, "tr"));
      setStudents(arr);
    }
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
      if (studentId) params.set("studentPackageId", studentId); // önemli: paket id gönderiyoruz
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

  useEffect(() => {
    fetchStudents();
  }, []);
  useEffect(() => {
    load(); // await GET kullanımı - üstte
  }, [q, status, method, studentId, dateFrom, dateTo, page]);

  /** Kaydet (create/update) */
  async function save() {
    if (!form.student_package_id || !form.amount) return alert("Öğrenci paketi ve tutar zorunlu");
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
    const url = editing ? "/api/admin/payments/update" : "/api/admin/payments/create";
    const methodFetch = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...payload } : payload;

    const res = await fetch(url, {
      method: methodFetch,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j?.error || "Kaydedilemedi");
    setModalOpen(false);
    setPage(1);
    await load();
  }

  /** Sil */
  async function remove(id: string) {
    if (!confirm("Ödemeyi silmek istiyor musun?")) return;
    const res = await fetch("/api/admin/payments/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return alert(j?.error || "Silinemedi");
    await load();
  }

  // ---- Yaklaşan ödemeler (7 gün) ----
  const upcoming = useMemo(() => {
    const now = new Date();
    const until = addDays(now, 7);
    return (items || [])
      .filter((p) => p.status === "paid")
      .map((p) => ({ ...p, next_due: calcNextDue(p) }))
      .filter((p) => p.next_due && (p.next_due as Date) >= now && (p.next_due as Date) <= until)
      .sort((a: any, b: any) => (a.next_due as any) - (b.next_due as any));
  }, [items]);

  /** Tek kişiye SMS hatırlatma (Netgsm backend /api/admin/payments/remind) */
  async function remindPayment(p: any) {
    const defaultMsg = `Merhaba ${p.parent_name ?? ""}, ${p.student_name ?? "öğrenci"} için ödeme hatırlatmasıdır. Sonraki tarih: ${
      p.next_due ? new Date(p.next_due).toLocaleDateString("tr-TR") : "—"
    }. Sorunuz varsa bize yazabilirsiniz.`;
    const custom = prompt("SMS içeriği:", defaultMsg);
    if (custom === null) return;

    const res = await fetch("/api/admin/payments/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: p.id, customMessage: custom }),
    });
    const raw = await res.text();
    try {
      const j = JSON.parse(raw);
      if (!res.ok) return alert(j?.error || raw);
    } catch {
      if (!res.ok) return alert(raw);
    }
    alert("Hatırlatma gönderildi.");
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
          <p className="text-sm text-gray-700">Hasılatı ve ödeme geçmişini takip et.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Yenile
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Yeni Ödeme
          </button>
        </div>
      </div>

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      {/* Yaklaşan Ödemeler */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-900">Yaklaşan Ödemeler (7 gün)</h2>
            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              {upcoming.length} kişi
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{p.student_name || "—"}</div>
                    <div className="text-xs text-gray-700">
                      {p.parent_name} • {p.parent_phone_e164}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-700">Sonraki tarih</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {p.next_due ? new Date(p.next_due).toLocaleDateString("tr-TR") : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => remindPayment(p)}
                    className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    SMS Hatırlat
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50"
                  >
                    Düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Toplam Hasılat (filtre)" value={money(summary?.totalRevenue || 0)} tone="emerald" />
        <Stat label="Ödeme Adedi" value={String(total)} />
        <Stat label="Paid" value={String(summary?.countByStatus?.paid || 0)} tone="emerald" />
        <Stat label="Pending" value={String(summary?.countByStatus?.pending || 0)} tone="amber" />
        <Stat label="Refunded" value={String(summary?.countByStatus?.refunded || 0)} tone="indigo" />
      </div>

      {/* Metot Kırılımı */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Metot Kırılımı (filtre)</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {["card", "cash", "transfer"].map((m) => (
            <span
              key={m}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-medium text-gray-900"
            >
              {m.toUpperCase()}: <b className="font-semibold">{money(summary?.methodBreakdown?.[m] || 0)}</b>
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
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
            value={studentId}
            onChange={(e) => {
              setPage(1);
              setStudentId(e.target.value);
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
              <th className="px-4 py-3">Dönem</th>
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
              items.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{new Date(p.paid_at).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{p.student_name || "—"}</div>
                    <div className="text-xs text-gray-700">
                      {p.parent_name} • {p.parent_phone_e164}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{money(Number(p.amount || 0))}</td>
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
                  <td className="px-4 py-3">
                    {p.period_start ? new Date(p.period_start).toLocaleDateString("tr-TR") : "—"} –
                    {p.period_end ? " " + new Date(p.period_end).toLocaleDateString("tr-TR") : " —"}
                  </td>
                  <td className="px-4 py-3">{p.note || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
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
              ))}
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
            Sayfa {page}/{pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <Modal title={editing ? "Ödeme Düzenle" : "Yeni Ödeme"} onClose={() => setModalOpen(false)}>
          <div className="space-y-3 text-gray-900">
            <Row label="Öğrenci/Paket *">
              <select
                value={form.student_package_id}
                onChange={(e) => setForm((f: any) => ({ ...f, student_package_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Seçin…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name}{s.package_name ? ` • ${s.package_name}` : ""}
                  </option>
                ))}
              </select>
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
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </Row>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Row label="Ödeme Tarihi">
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
              disabled={busy}
              onClick={save}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </Modal>
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
