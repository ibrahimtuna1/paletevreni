"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminApi } from "@/lib/hooks/useAdminApi";

/* ----------------- Tipler ----------------- */
type Item = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  age: number;
  date_id?: string | null; // DB'de boş olabilir
  status: "pending" | "approved" | "rejected";
  created_at: string;

  heard_from?: string | null;
  heard_from_other?: string | null;
};

type Filter = "all" | "pending" | "approved" | "rejected";

/* ----------------- Telefon helper'ları (TR) ----------------- */
// Normalize: 10 haneli 5XXXXXXXXX
function normalizeTR(msisdn: string): string | null {
  const digits = (msisdn || "").replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  d = d.slice(-10);
  return d.length === 10 && d.startsWith("5") ? d : null;
}
// UI'de her zaman 0'lı göster (05XXXXXXXXX)
function displayTR(msisdn: string): string | null {
  const n = normalizeTR(msisdn);
  return n ? `0${n}` : null;
}
// tel: link için E.164 (+905XXXXXXXXX)
function telHrefTR(msisdn: string): string | null {
  const n = normalizeTR(msisdn);
  return n ? `+90${n}` : null;
}

/* ----------------- Kaynak (heard_from) helper'ları ----------------- */
const HEARD_LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  arkadas: "Arkadaş",
  arkadaştan: "Arkadaş",
  afis: "Afiş",
  afiş: "Afiş",
  reklam: "Reklam",
  okul: "Okul",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  diger: "Diğer",
  other: "Diğer",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function heardLabel(i: Item): string {
  const code = (i.heard_from || "").trim().toLowerCase();
  if (!code) return "—";
  const base = HEARD_LABELS[code] ?? cap(code);
  if (code === "diger" || code === "other") {
    const extra = (i.heard_from_other || "").trim();
    return extra ? `${base}: ${extra}` : base;
  }
  return base;
}

/* ----------------- Sayfa ----------------- */
export default function ApplicationsPage() {
  const api = useAdminApi("/api/admin/applications");
  const approveApi = useAdminApi("/api/admin/trials/approve");

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveWhen, setApproveWhen] = useState<string>("");

  async function load() {
    const res = await api.get();
    if (res?.items) setItems(res.items as Item[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, "");
    return items
      .filter((i) => (filter === "all" ? true : i.status === filter))
      .filter((i) => {
        if (!term) return true;
        const dispPhone = displayTR(i.parent_phone) || i.parent_phone;
        const sourceText = `${i.heard_from || ""} ${i.heard_from_other || ""}`.toLowerCase();
        const hayText = `${i.student_name} ${i.parent_name} ${dispPhone} ${sourceText}`.toLowerCase();
        if (hayText.includes(term)) return true;

        const phoneNorm = normalizeTR(i.parent_phone) || "";
        if (termDigits.length >= 3) {
          const variants = [phoneNorm, `0${phoneNorm}`, `90${phoneNorm}`, `+90${phoneNorm}`];
          if (variants.some((v) => v.includes(termDigits))) return true;
        }
        return false;
      });
  }, [items, search, filter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      rejected: items.filter((i) => i.status === "rejected").length,
    }),
    [items]
  );

  async function setStatus(id: string, status: Item["status"]) {
    setBusyId(id);
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await api.patch("update", { id, status });
    setBusyId(null);
    if (!res) load();
  }

  async function remove(id: string) {
    if (!confirm("Bu başvuruyu silmek istiyor musun?")) return;
    setBusyId(id);
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    const res = await api.del("delete", { id });
    setBusyId(null);
    if (!res) setItems(before);
  }

  function openApproveModal(i: Item) {
    setApproveId(i.id);
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    setApproveWhen(toLocalDatetimeInputValue(d));
    setApproveOpen(true);
  }

  async function confirmApprove() {
  if (!approveId || !approveWhen) return;
  setBusyId(approveId);

  const res = await fetch("/api/admin/trials/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicationId: approveId,
      scheduledAt: new Date(approveWhen).toISOString(),
    }),
  });

  setBusyId(null);
  setApproveOpen(false);
  setApproveId(null);

  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    alert(j?.error || "Onay sırasında hata oluştu.");
    await load();
    return;
  }
  setItems((xs) => xs.map((x) => (x.id === approveId ? { ...x, status: "approved" } : x)));
}


  const headers = [
    "Tarih",
    "Öğrenci",
    "Veli",
    "Telefon",
    "Kaynak",
    "Yaş",
    "Gün (opsiyonel)",
    "Durum",
    "",
  ];

  return (
    <div className="space-y-7">
      {/* header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Başvurular</h1>
          <p className="text-sm text-gray-700">Başvuruları görüntüle, filtrele ve durumlarını yönet.</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>

      {/* istatistik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam" value={stats.total} gradient="from-indigo-500 to-indigo-700" />
        <StatCard title="Bekleyen" value={stats.pending} gradient="from-amber-500 to-amber-700" />
        <StatCard title="Onaylanan" value={stats.approved} gradient="from-emerald-500 to-emerald-700" />
        <StatCard title="Reddedilen" value={stats.rejected} gradient="from-rose-500 to-rose-700" />
      </div>

      {/* arama & filtre */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Öğrenci, veli adı, telefon veya kaynak ara..."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black/20 sm:max-w-md"
        />
        <div className="flex gap-2">
          <FilterBtn label="Hepsi" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterBtn label="Bekleyen" active={filter === "pending"} onClick={() => setFilter("pending")} />
          <FilterBtn label="Onaylı" active={filter === "approved"} onClick={() => setFilter("approved")} />
          <FilterBtn label="Reddedilen" active={filter === "rejected"} onClick={() => setFilter("rejected")} />
        </div>
      </div>

      {/* tablo */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {api.loading &&
              [...Array(4)].map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-gray-100">
                  {Array.from({ length: headers.length }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {!api.loading &&
              filtered.map((i) => {
                const disp = displayTR(i.parent_phone);
                const href = telHrefTR(i.parent_phone);

                const cells = [
                  <td key="created" className="px-4 py-3 text-gray-700">
                    {new Date(i.created_at).toLocaleString("tr-TR")}
                  </td>,
                  <td key="student" className="px-4 py-3 font-medium text-gray-900">
                    {i.student_name}
                  </td>,
                  <td key="parent" className="px-4 py-3 text-gray-800">
                    {i.parent_name}
                  </td>,
                  <td key="phone" className="px-4 py-3 text-gray-800">
                    {disp ? (
                      <a href={`tel:${href}`} className="hover:underline" title={i.parent_phone}>
                        {disp}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>,
                  <td key="heard" className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {heardLabel(i)}
                    </span>
                  </td>,
                  <td key="age" className="px-4 py-3 text-gray-800">
                    {i.age}
                  </td>,
                  <td key="date" className="px-4 py-3 text-gray-800">
                    {i.date_id ? `${i.date_id} • 20:00` : "—"}
                  </td>,
                  <td key="status" className="px-4 py-3">
                    <StatusPill status={i.status} />
                  </td>,
                  <td key="actions" className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busyId === i.id}
                        onClick={() => openApproveModal(i)}
                        className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Onayla
                      </button>
                      <button
                        disabled={busyId === i.id}
                        onClick={() => setStatus(i.id, "rejected")}
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Reddet
                      </button>
                      <button
                        disabled={busyId === i.id}
                        onClick={() => setStatus(i.id, "pending")}
                        className="rounded-md border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Beklet
                      </button>
                      <button
                        disabled={busyId === i.id}
                        onClick={() => remove(i.id)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </td>,
                ];

                return (
                  <tr key={i.id} className="border-t border-gray-100">
                    {cells}
                  </tr>
                );
              })}

            {!api.loading && filtered.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-gray-500">
                  Kriterlere uyan başvuru bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* APPROVE MODAL */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Tanıtım Dersi Tarihi</h3>
            <p className="mt-1 text-sm text-gray-600">Başvuruyu onaylamak için ders tarih-saatini seç.</p>

            <div className="mt-4">
              <label className="text-sm text-gray-700">Tarih &amp; Saat</label>
              <input
                type="datetime-local"
                value={approveWhen}
                onChange={(e) => setApproveWhen(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
              />
              <p className="mt-1 text-xs text-gray-500">Saat dilimi: sisteminin yereli. Sunucuya ISO (UTC) gönderilir.</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setApproveOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                disabled={!approveId || !approveWhen || busyId === approveId}
                onClick={confirmApprove}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === approveId ? "Kaydediliyor…" : "Onayla & Tarih Ata"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Küçük bileşenler & yardımcılar ----------------- */

function StatCard({ title, value, gradient }: { title: string; value: number; gradient: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-600">{title}</div>
      <div className={`mt-2 inline-flex items-center rounded-lg bg-gradient-to-r ${gradient} px-3 py-1 text-2xl font-bold text-white`}>
        {new Intl.NumberFormat("tr-TR").format(value)}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "pending"
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  const label = status === "approved" ? "Onaylandı" : status === "pending" ? "Bekliyor" : "Reddedildi";
  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? "bg-black text-white" : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function toLocalDatetimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
