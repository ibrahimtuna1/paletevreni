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
  paid_at: string | null;      // ISO veya null
  period_start: string | null; // ISO (date) – postpaid senaryosu için
  period_end: string | null;   // ISO (date) – postpaid ise ödeme günü (VADE)
  note: string | null;
};

/** Filtre select'i için: öğrenci paketi (id=student_package_id) */
type Student = { id: string; student_name: string; package_name?: string | null };

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
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const daysDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "—");

/** MVP: 1 aylık paket = 30 gün varsayımı.
 *  postpaid ise period_end ödeme günü kabul edilir. prepaid ise paid_at + 30.
 */
function calcNextDue(p: Payment): Date | null {
  const MONTH_DAYS = 30;
  if (p.period_end) return new Date(p.period_end);
  if (p.paid_at) return addDays(new Date(p.paid_at), MONTH_DAYS);
  return null;
}

/** Trafik ışığı:
 *  - KIRMIZI: status != paid && next_due < bugün  (gecikmiş)
 *  - SARI:    status != paid && 0 <= gün <= 7     (yaklaşıyor)
 *  - YEŞİL:   status != paid && gün > 7           (günü var)
 *  paid olanlar ışığa girmez.
 */
function trafficLight(p: Payment) {
  const due = calcNextDue(p);
  if (!due) return null;
  if (p.status === "paid") return null;

  const now = new Date();
  const d = daysDiff(due, now); // due - now (gün)
  if (d < 0) return "red";
  if (d <= 7) return "yellow";
  return "green";
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

  // seçim / toplu aksiyon
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAllOnPage = () => setSelected(new Set(items.map((x) => x.id)));
  const clearSelection = () => setSelected(new Set());

  // modal (oluştur/düzenle)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<{ student_name: string; package_name?: string|null; student_package_id?: string|null } | null>(null);
  const [form, setForm] = useState<any>({
    student_package_id: "",
    amount: "",
    method: "card",
    status: "pending", // postpaid dünyasında default pending
    paid_at: "",
    period_start: "",
    period_end: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setPicked(null);
    setForm({
      student_package_id: "",
      amount: "",
      method: "card",
      status: "pending",
      paid_at: "", // ödemeyi gerçekten aldığında doldur
      period_start: new Date().toISOString().slice(0, 10),
      period_end: "",
      note: "",
    });
    setModalOpen(true);
  }
  function openEdit(p: Payment) {
    setEditing(p);
    setPicked({
      student_name: p.student_name || "—",
      package_name: null,
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
      if (studentId) params.set("studentPackageId", studentId);
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
      clearSelection();
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
    load();
  }, [q, status, method, studentId, dateFrom, dateTo, page]);

  /** Kaydet (create/update) */
  async function save() {
    if (!form.student_package_id) return alert("Öğrenci seç ve paketi bağla (student_package_id zorunlu).");
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
    const url = editing ? "/api/admin/payments/update" : "/api/admin/payments/create";
    let res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });

    if (!res.ok && editing) {
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
    setPage(1);
    await load();
  }

  /** Sil – query fallback eklendi */
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

  // ---- Uyarı kümeleri ----
  const { overdue, dueSoon, safe } = useMemo(() => {
    const list = (items || []).map((p) => ({ p, tl: trafficLight(p), due: calcNextDue(p) }));
    const overdue = list
      .filter((x) => x.tl === "red")
      .sort((a, b) => (a.due!.getTime() - b.due!.getTime()));
    const dueSoon = list
      .filter((x) => x.tl === "yellow")
      .sort((a, b) => (a.due!.getTime() - b.due!.getTime()));
    const safe = list
      .filter((x) => x.tl === "green")
      .sort((a, b) => (a.due!.getTime() - b.due!.getTime()));
    return { overdue, dueSoon, safe };
  }, [items]);

  /** Tek kişiye SMS */
  async function remindOne(p: Payment, next_due?: Date | null) {
    const defaultMsg = `Merhaba ${p.parent_name ?? ""}, ${p.student_name ?? "öğrenci"} için ödeme hatırlatmasıdır. Sonraki tarih: ${
      next_due ? next_due.toLocaleDateString("tr-TR") : "—"
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

  /** Seçili kişilere toplu SMS (teker teker gönderir) */
  async function remindSelected() {
    if (selected.size === 0) return alert("Seçili ödeme yok.");
    const targets = items.filter((p) => selected.has(p.id)).map((p) => ({ p, due: calcNextDue(p) }));
    const sample = targets[0];
    const defaultMsg = `Merhaba, ${targets.length} kişi için ödeme hatırlatması gönderilecektir. En yakın örnek tarih: ${
      sample?.due ? sample.due.toLocaleDateString("tr-TR") : "—"
    }. Sorunuz varsa bize yazabilirsiniz.`;
    const custom = prompt("SMS içeriği (tümüne):", defaultMsg);
    if (custom === null) return;

    let ok = 0, fail = 0;
    for (const t of targets) {
      const res = await fetch("/api/admin/payments/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: t.p.id, customMessage: custom }),
      });
      if (res.ok) ok++; else fail++;
    }
    alert(`SMS tamamlandı. Başarılı: ${ok}, Hatalı: ${fail}`);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Başlık + toplu aksiyonlar */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
          <p className="text-sm text-gray-700">Hasılatı ve ödeme geçmişini takip et.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-900">
                Seçili: <b>{selected.size}</b>
              </span>
              <button
                onClick={remindSelected}
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Seçililere SMS
              </button>
              <button
                onClick={clearSelection}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                Temizle
              </button>
            </>
          )}
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

      {/* KIRMIZI: Geciken Ödemeler */}
      {overdue.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-rose-900">Geciken Ödemeler</h2>
            <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">
              {overdue.length} kişi
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {overdue.map(({ p, due }) => (
              <div key={p.id} className="rounded-xl border border-rose-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{p.student_name || "—"}</div>
                    <div className="text-xs text-gray-700">
                      {p.parent_name} • {p.parent_phone_e164}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-700">Vade</div>
                    <div className="text-sm font-semibold text-rose-900">
                      {due ? due.toLocaleDateString("tr-TR") : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => remindOne(p, due)}
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

      {/* SARI: Yaklaşan Ödemeler (7 gün) */}
      {dueSoon.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-900">Yaklaşan Ödemeler (7 gün)</h2>
            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              {dueSoon.length} kişi
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {dueSoon.map(({ p, due }) => (
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
                      {due ? due.toLocaleDateString("tr-TR") : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => remindOne(p, due)}
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
        <Stat label="Ödendi" value={String(summary?.countByStatus?.paid || 0)} tone="emerald" />
        <Stat label="Bekliyor" value={String(summary?.countByStatus?.pending || 0)} tone="amber" />
        <Stat label="İade" value={String(summary?.countByStatus?.refunded || 0)} tone="indigo" />
      </div>

      {/* Metot Kırılımı */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Metot Kırılımı (filtre)</h2>
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
              <th className="px-4 py-3">
                <button
                  onClick={selectAllOnPage}
                  className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-900 hover:bg-gray-100"
                >
                  Tümü
                </button>
              </th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Öğrenci</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Metot</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Dönem</th>
              <th className="px-4 py-3">Işık</th>
              <th className="px-4 py-3">Not</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="text-[15px] text-gray-900">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-700">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => {
                const due = calcNextDue(p);
                const tl = trafficLight(p);
                return (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="size-4 accent-black"
                      />
                    </td>
                    <td className="px-4 py-3">{p.paid_at ? new Date(p.paid_at).toLocaleString("tr-TR") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.student_name || "—"}</div>
                      <div className="text-xs text-gray-700">
                        {p.parent_name} • {p.parent_phone_e164}
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
                      {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                    </td>
                    <td className="px-4 py-3">
                      {tl === "red" && <span className="inline-block h-3 w-3 rounded-full bg-rose-500" title="Gecikmiş" />}
                      {tl === "yellow" && <span className="inline-block h-3 w-3 rounded-full bg-amber-500" title="Yakında" />}
                      {tl === "green" && <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="Günü var" />}
                      {!tl && <span className="text-xs text-gray-500">—</span>}
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
                          onClick={() => remindOne(p, due)}
                          className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                        >
                          SMS
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
                <td colSpan={10} className="px-4 py-10 text-center text-gray-700">
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
              <Row label="Dönem Bitiş (vade)">
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

      {/* Öğrenci seçici mini modalı */}
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

/** Öğrenci seçici – tanitim_dersi_ogrencileri tablosundan çeker */
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
