"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Student = {
  id: string;
  student_name: string;
  parent_name?: string | null;
  parent_phone_e164?: string | null;
};

type ActiveRowFromAPI = {
  student_package_id: string;
  student_id: string;
  student_name: string;
  parent_name: string | null;
  parent_phone_e164: string | null;
  package_title: string | null;
  start_date: string | null;
  period_end: string | null;
  bucket: "expired" | "upcoming" | "active";
  amount: number;
};

type LastResp = {
  item?: {
    id: string;
    start_date: string | null;
    end_date: string | null; // hesaplanmış
    package_title: string | null;
    status: "active" | "past" | "left" | "paused";
  } | null;
};

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
  const [hidingLeftIds, setHidingLeftIds] = useState<Set<string>>(new Set()); // local gizleme

  // yükle
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) tüm öğrenciler (left olanlar da dönebilir; biz gizleyebileceğiz)
        const sRes = await fetch("/api/admin/students/list", { cache: "no-store" });
        const sJ = await sRes.json().catch(() => ({}));
        if (!sRes.ok) throw new Error(sJ?.error || "Öğrenciler alınamadı");
        const students: Student[] = (sJ.items || []).map((x: any) => ({
          id: x.id,
          student_name: x.student_name,
          parent_name: x.parent_name ?? null,
          parent_phone_e164: x.parent_phone_e164 ?? null,
        }));

        // 2) aktif dönemleri (bitiş ve bucket hazır)
        const aRes = await fetch("/api/admin/renewals/list", { cache: "no-store" });
        const aJ = await aRes.json().catch(() => ({}));
        if (!aRes.ok) throw new Error(aJ?.error || "Aktif kayıtlar alınamadı");
        const activeMap = new Map<string, ActiveRowFromAPI>();
        (aJ.items || []).forEach((r: ActiveRowFromAPI) => activeMap.set(r.student_id, r));

        // 3) tek liste oluştur: aktif varsa ordan, yoksa last endpoint ile son dönemi sorgula
        const base: Row[] = students.map((s) => {
          const a = activeMap.get(s.id);
          if (a) {
            return {
              student_id: s.id,
              student_name: a.student_name,
              parent_name: a.parent_name,
              parent_phone_e164: a.parent_phone_e164,
              package_title: a.package_title,
              start_date: a.start_date,
              period_end: a.period_end,
              bucket: a.bucket,
              student_package_id: a.student_package_id,
            };
          }
          // geçici placeholder – birazdan last ile dolduracağız
          return {
            student_id: s.id,
            student_name: s.student_name,
            parent_name: s.parent_name ?? null,
            parent_phone_e164: s.parent_phone_e164 ?? null,
            package_title: null,
            start_date: null,
            period_end: null,
            bucket: "none",
            student_package_id: null,
          };
        });

        // 4) aktif olmayanlar için son dönemi getir (toplu, Promise.all)
        const needLast = base.filter((r) => r.bucket === "none");
        const lastResponses = await Promise.all(
          needLast.map((r) =>
            fetch(
              `/api/admin/studentpackages/last?student_id=${encodeURIComponent(
                r.student_id
              )}`,
              { cache: "no-store" }
            )
              .then((res) => res.json().catch(() => ({})))
              .catch(() => ({}))
          )
        );

        needLast.forEach((row, idx) => {
          const jr: LastResp = lastResponses[idx] || {};
          const it = jr?.item;
          if (it?.start_date || it?.end_date) {
            const end = it?.end_date || null;
            const today = new Date().toISOString().slice(0, 10);
            let bucket: Row["bucket"] = "active";
            if (!end) bucket = "none";
            else {
              const diff =
                (new Date(end + "T00:00:00").getTime() -
                  new Date(today + "T00:00:00").getTime()) /
                86400000;
              bucket = diff < 0 ? "expired" : diff <= 7 ? "upcoming" : "active";
            }
            row.package_title = it?.package_title || null;
            row.start_date = it?.start_date || null;
            row.period_end = it?.end_date || null;
            row.bucket = bucket;
          } else {
            row.bucket = "none"; // hiç paket almamış
          }
        });

        setRows(base);
      } catch (e: any) {
        setErr(e.message || "Hata");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtreleme + sıralama (önce upcoming, sonra expired, sonra active, sonra none)
  const view = useMemo(() => {
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
        const aname = (a.student_name ?? "").toString();
        const bname = (b.student_name ?? "").toString();
        return aname.localeCompare(bname, "tr", { sensitivity: "base" });
      });
  }, [rows, q, hidingLeftIds]);

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
    // listeden gizle
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
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
          Yaklaşıyor
        </span>
      );
    if (b === "expired")
      return (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-900">
          Geçmiş
        </span>
      );
    if (b === "active")
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
          Aktif
        </span>
      );
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-900">
        Kayıt Yok
      </span>
    );
  };

  const rowTone = (b: Row["bucket"]) =>
    b === "upcoming"
      ? "bg-amber-50"
      : b === "expired"
      ? "bg-rose-50"
      : "bg-white";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kayıt Yenilemeler</h1>
          <p className="text-sm text-gray-700">
            Tüm öğrenciler tek listede. Yaklaşanlar sarı, geçmişler kırmızı.
          </p>
        </div>
        <Link
          href="/admin/renewals/new"
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Elle Yenile
        </Link>
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

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
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
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-700">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading &&
              view.map((r) => (
                <tr key={r.student_id} className={`border-t border-gray-100 ${rowTone(r.bucket)}`}>
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
                        href={`/admin/renewals/new?studentId=${r.student_id}`}
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
                        Öğrenci ayrıldı
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && view.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-700">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}