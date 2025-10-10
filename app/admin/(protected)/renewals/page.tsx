"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Backend'den gelecek yeni API yanıtının şekli
type StudentStatusFromAPI = {
  // students tablosundan
  id: string;
  student_name: string;
  parent_name: string | null;
  parent_phone_e164: string | null;
  // ogrenci_paketleri tablosundan (en son kayıt)
  student_package_id: string | null;
  package_title: string | null;
  start_date: string | null;
  period_end: string | null; // Paketin hesaplanmış bitiş tarihi
};

// Sayfada kullanılacak veri tipi (bu değişmedi)
type Row = {
  student_id: string;
  student_name: string;
  parent_name: string | null;
  parent_phone_e164: string | null;
  package_title: string | null;
  start_date: string | null;
  period_end: string | null;
  bucket: "expired" | "upcoming" | "active" | "none";
  student_package_id?: string | null;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "—";

export default function RenewalsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [hidingLeftIds, setHidingLeftIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // --- YENİ VE BASİTLEŞTİRİLMİŞ YÜKLEME MANTIĞI ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1. Tek ve güçlü bir API isteği ile tüm veriyi çekiyoruz.
        // Bu endpoint, tüm öğrencileri ve her birinin en son paket bilgisini getirmeli.
        const res = await fetch("/api/admin/renewals/student-status-list", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Kayıt verileri alınamadı");
        
        const itemsFromAPI: StudentStatusFromAPI[] = j.items || [];

        // 2. Gelen veriyi frontend'de işleyip 'bucket' (durum) ataması yapıyoruz.
        const today = new Date().toISOString().slice(0, 10);
        const processedRows: Row[] = itemsFromAPI.map((item) => {
          let bucket: Row["bucket"] = "none";
          
          if (item.period_end) {
            const diff =
              (new Date(item.period_end + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
              86400000;
            bucket = diff < 0 ? "expired" : diff <= 7 ? "upcoming" : "active";
          }
          
          return {
            student_id: item.id,
            student_name: item.student_name,
            parent_name: item.parent_name,
            parent_phone_e164: item.parent_phone_e164,
            package_title: item.package_title,
            start_date: item.start_date,
            period_end: item.period_end,
            bucket: bucket,
            student_package_id: item.student_package_id,
          };
        });

        setRows(processedRows);

      } catch (e: any) {
        setErr(e.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtreleme + sıralama (öncelik: upcoming → expired → active → none)
  const filtered = useMemo(() => {
    const prio = (b: Row["bucket"]) =>
      b === "upcoming" ? 0 : b === "expired" ? 1 : b === "active" ? 2 : 3;
    const text = q.trim().toLocaleLowerCase("tr");
    return rows
      .filter((r) => !hidingLeftIds.has(r.student_id))
      .filter((r) =>
        !text
          ? true
          : `${r.student_name} ${r.parent_name ?? ""} ${r.parent_phone_e164 ?? ""} ${r.package_title ?? ""}`
              .toLocaleLowerCase("tr")
              .includes(text)
      )
      .sort((a, b) => {
        const d = prio(a.bucket) - prio(b.bucket);
        if (d !== 0) return d;
        return (a.student_name || "").localeCompare(b.student_name || "", "tr", { sensitivity: "base" });
      });
  }, [rows, q, hidingLeftIds]);

  // gruplar
  const groups = useMemo(() => {
    const g = {
      upcoming: [] as Row[],
      expired: [] as Row[],
      active: [] as Row[],
      none: [] as Row[],
    };
    for (const r of filtered) g[r.bucket].push(r);
    return g;
  }, [filtered]);

  async function markLeft(studentId: string) {
    if (!confirm("Öğrenciyi 'ayrıldı' yapalım mı? (Geçmiş silinmez)")) return;
    const res = await fetch("/api/admin/students/mark-left", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j?.error || "Ayrıldı olarak işaretlenemedi");
      return;
    }
    setHidingLeftIds((s) => new Set(s).add(studentId));
  }

  async function sendSMS(r: Row) {
    const msg = prompt(
      `SMS içeriği:\nMerhaba ${r.parent_name ?? ""}, ${r.student_name} için kayıt bilgisi. Bitiş: ${fmt(
        r.period_end
      )}.`
    );
    if (msg == null) return;
    const res = await fetch("/api/admin/payments/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: r.student_id, customMessage: msg }),
    });
    if (!res.ok) alert("SMS gönderilemedi");
    else alert("Gönderildi");
  }

  const bucketChip = (b: Row["bucket"]) => {
    if (b === "upcoming")
      return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Yaklaşıyor</span>;
    if (b === "expired")
      return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-900">Geçmiş</span>;
    if (b === "active")
      return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">Aktif</span>;
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-900">Kayıt Yok</span>;
  };

  const Section = ({
    title,
    tone,
    items,
    collapsedByDefault = false,
  }: {
    title: string;
    tone: "amber" | "rose" | "emerald" | "gray";
    items: Row[];
    collapsedByDefault?: boolean;
  }) => {
    const [open, setOpen] = useState(!collapsedByDefault);
    const toneBg =
      tone === "amber" ? "bg-amber-50 border-amber-200" :
      tone === "rose" ? "bg-rose-50 border-rose-200" :
      tone === "emerald" ? "bg-emerald-50 border-emerald-200" :
      "bg-gray-50 border-gray-200";

    return (
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className={`flex items-center justify-between rounded-t-2xl border-b px-4 py-3 ${toneBg}`}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-900">{items.length}</span>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-gray-700 underline underline-offset-2"
          >
            {open ? "Gizle" : "Göster"}
          </button>
        </div>

        {open && (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((r) => (
                <div key={r.student_id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold text-gray-900">{r.student_name}</div>
                    {bucketChip(r.bucket)}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    <div className="truncate">{r.parent_name || "—"} • {r.parent_phone_e164 || "—"}</div>
                    <div className="truncate">Paket: {r.package_title || "—"}</div>
                    <div className="text-gray-800">
                      {fmt(r.start_date)} — {fmt(r.period_end)}
                    </div>
                  
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        href={`/admin/renewals/new?studentId=${r.student_id}${r.period_end ? `&lastEndDate=${r.period_end}` : ''}`}
                      className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Yenile
                    </Link>
                    <button
                      onClick={() => sendSMS(r)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => markLeft(r.student_id)}
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      title="Öğrenciyi ayrıldı yap ve listeden çıkar"
                    >
                      Ayrıldı
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="p-4 text-sm text-gray-700">Kayıt yok.</div>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-800">
                  <tr>
                    <th className="px-4 py-3">Öğrenci</th>
                    <th className="px-4 py-3">Veli</th>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">İlk–Son Ders</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-gray-900">
                  {items.map((r) => (
                    <tr key={r.student_id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold">{r.student_name}</td>
                      <td className="px-4 py-3 text-sm">
                        {r.parent_name || "—"} • {r.parent_phone_e164 || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">{r.package_title || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {fmt(r.start_date)} — {fmt(r.period_end)}
                      </td>
                      <td className="px-4 py-3">{bucketChip(r.bucket)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                              href={`/admin/renewals/new?studentId=${r.student_id}${r.period_end ? `&lastEndDate=${r.period_end}` : ''}`}

                            className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                          >
                            Yenile
                          </Link>
                          <button
                            onClick={() => sendSMS(r)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            SMS
                          </button>
                          <button
                            onClick={() => markLeft(r.student_id)}
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                            title="Öğrenciyi ayrıldı yap ve listeden çıkar"
                          >
                            Ayrıldı
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-700">Kayıt yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kayıt Yenilemeler</h1>
          <p className="text-sm text-gray-700">
            Yaklaşanlar (sarı) ve geçmiş (kırmızı) üstte; tüm liste gruplu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode((m) => (m === "cards" ? "table" : "cards"))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            title="Görünümü değiştir"
          >
            {viewMode === "cards" ? "Tablo görünümü" : "Kart görünümü"}
          </button>
          <Link
            href="/admin/renewals/new"
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Elle Yenile
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ara: öğrenci / veli / telefon / paket…"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black/20"
        />
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
          {err}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-700 shadow-sm">
          Yükleniyor…
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <Section title="Yaklaşan (7 gün içinde)" tone="amber" items={groups.upcoming} />
          <Section title="Süresi Geçmiş" tone="rose" items={groups.expired} />
          <Section title="Aktif" tone="emerald" items={groups.active} collapsedByDefault />
          <Section title="Kayıt Yok" tone="gray" items={groups.none} collapsedByDefault />
        </div>
      )}
    </div>
  );
}