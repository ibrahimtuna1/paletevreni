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
};

type Filter = "all" | "pending" | "approved" | "rejected";

/* ----------------- Sayfa ----------------- */
export default function ApplicationsPage() {
  // Başvurular API
  const api = useAdminApi("/api/admin/applications");
  // Tanıtım dersi (approve) API
  const approveApi = useAdminApi("/api/admin/trials/approve");

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Onay modal state
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveWhen, setApproveWhen] = useState<string>(""); // datetime-local

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
    return items
      .filter((i) => (filter === "all" ? true : i.status === filter))
      .filter((i) =>
        term
          ? `${i.student_name} ${i.parent_name} ${i.parent_phone}`.toLowerCase().includes(term)
          : true
      );
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
    // optimistic
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await api.patch("update", { id, status });
    setBusyId(null);
    if (!res) load(); // rollback
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
    // default: bugünün 20:00'ı (yerel)
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    setApproveWhen(toLocalDatetimeInputValue(d));
    setApproveOpen(true);
  }

  async function confirmApprove() {
    if (!approveId || !approveWhen) return;
    setBusyId(approveId);

    // datetime-local -> ISO (kullanıcı TZ’si ile)
    const iso = new Date(approveWhen).toISOString();

    const res = await approveApi.post({
       applicationId: approveId as string,
       scheduledAt: iso,
     });
    setBusyId(null);
    setApproveOpen(false);
    setApproveId(null);

    if (!res?.ok) {
      alert(res?.error || "Onay sırasında hata oluştu.");
      await load();
      return;
    }

    // UI: başvuruyu "approved" işaretle
    setItems((xs) => xs.map((x) => (x.id === (approveId as string) ? { ...x, status: "approved" } : x)));
  }

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
          placeholder="Öğrenci, veli adı veya telefon ara..."
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
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Öğrenci</th>
              <th className="px-4 py-3">Veli</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Yaş</th>
              <th className="px-4 py-3">Gün (opsiyonel)</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {api.loading &&
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {!api.loading &&
              filtered.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(i.created_at).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{i.student_name}</td>
                  <td className="px-4 py-3 text-gray-800">{i.parent_name}</td>
                  <td className="px-4 py-3 text-gray-800">{formatPhone(i.parent_phone)}</td>
                  <td className="px-4 py-3 text-gray-800">{i.age}</td>
                  <td className="px-4 py-3 text-gray-800">{i.date_id ? `${i.date_id} • 20:00` : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={i.status} />
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))}

            {!api.loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
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
            <p className="mt-1 text-sm text-gray-600">
              Başvuruyu onaylamak için ders tarih-saatini seç.
            </p>

            <div className="mt-4">
              <label className="text-sm text-gray-700">Tarih &amp; Saat</label>
              <input
                type="datetime-local"
                value={approveWhen}
                onChange={(e) => setApproveWhen(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:ring-black/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Saat dilimi: sisteminin yereli. Sunucuya ISO (UTC) gönderilir.
              </p>
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
      <div
        className={`mt-2 inline-flex items-center rounded-lg bg-gradient-to-r ${gradient} px-3 py-1 text-2xl font-bold text-white`}
      >
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
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>
  );
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

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length < 10) return v;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
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
