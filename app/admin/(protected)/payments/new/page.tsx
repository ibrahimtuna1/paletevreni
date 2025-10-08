// app/admin/(protected)/payments/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PaymentMethod = "card" | "cash" | "transfer";

type StudentLite = {
  id: string;
  student_name: string;
  parent_name?: string | null;
  parent_phone_e164?: string | null;
};

type PackageLite = {
  id: string;
  display_name: string;
  duration_days?: number | null;
  price?: number | null;
  is_active?: boolean | null;
};

export default function NewPaymentPage() {
  const router = useRouter();

  // seçilen öğrenci ve paket ayrı
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [pkg, setPkg] = useState<PackageLite | null>(null);

  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);

  const [form, setForm] = useState<any>({
    method: "card" as PaymentMethod,
    note: "",
  });
  const [busy, setBusy] = useState(false);

  // Preview state for renewal logic
  const [lastEnd, setLastEnd] = useState<string | null>(null);           // YYYY-MM-DD of previous period_end
  const [previewStart, setPreviewStart] = useState<string | null>(null); // computed: lastEnd + 7 days
  const [previewEnd, setPreviewEnd] = useState<string | null>(null);     // computed from pkg.duration_days: start + (duration_days - 7)
  // Registration history state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  function toYMD(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  function addDaysStr(ymd: string, days: number) {
    const d = new Date(ymd);
    d.setDate(d.getDate() + days);
    return toYMD(d);
  }

  async function loadLastEnd(studentId: string) {
    setLastEnd(null);
    setHistory([]);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/studentpackages/last?student_id=${encodeURIComponent(studentId)}&history=1`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Son kayıt alınamadı");
      const end = j?.period_end as string | null;
      setLastEnd(end || null);
      setHistory(Array.isArray(j?.history) ? j.history : []);
    } catch {
      setLastEnd(null);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (lastEnd && pkg?.duration_days) {
      const start = addDaysStr(lastEnd, 0); // 1 hafta ileri değil, 1 hafta daha erken (tüm tarihler 1 hafta geri çekildi)
      // 1 ay = 4 ders → ilk dersten 3 hafta sonra son ders => duration_days - 7
      const end = addDaysStr(start, Math.max(0, (pkg.duration_days || 0) - 7));
      setPreviewStart(start);
      setPreviewEnd(end);
    } else {
      setPreviewStart(null);
      setPreviewEnd(null);
    }
  }, [lastEnd, pkg?.duration_days]);

  async function save() {
    if (!student) return alert("Öğrenciyi seç.");
    if (!pkg) return alert("Paketi seç.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/studentpackages/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          package_id: pkg.id,
          method: form.method,
          note: form.note || null,
          // isteğe bağlı: frontend hesapladığı tarihler, backend doğrular/override eder
          preview: {
            period_start: previewStart,
            period_end: previewEnd,
          }
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Kayıt yenileme başarısız");
      // Beklenti: backend yeni student_package oluşturur (öncekini pasife çeker),
      // payment sayısını artırır ve tarihlerle döner.
      router.push("/admin/payments");
    } catch (e: any) {
      alert(e.message || "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Kayıt</h1>
          <p className="text-sm text-gray-700">Öğrenci + paket seç; yöntem ve not ekle. Tarihler, önceki dönemin bitişine göre 1 hafta geri çekilerek hesaplanır.</p>
        </div>
        <Link
          href="/admin/payments"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
        >
          ← Geri
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-4 text-gray-900">
          {/* Öğrenci */}
          <Row label="Öğrenci *">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={
                  student
                    ? `${student.student_name}${student.parent_name ? " • " + student.parent_name : ""}`
                    : ""
                }
                placeholder="Öğrenci seçin…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
              <button
                onClick={() => setStudentPickerOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
              >
                Seç
              </button>
              {student && (
                <button
                  onClick={() => setStudent(null)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Temizle
                </button>
              )}
            </div>
          </Row>

          {/* Paket */}
          <Row label="Paket *">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={pkg ? pkg.display_name : ""}
                placeholder="Paket seçin…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
              <button
                onClick={() => setPackagePickerOpen(true)}
                disabled={!student}
                title={!student ? "Önce öğrenci seç" : ""}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                Seç
              </button>
              {pkg && (
                <button
                  onClick={() => setPkg(null)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Temizle
                </button>
              )}
            </div>
            {!student && <div className="mt-2 text-xs text-amber-700">Paket aramak için önce öğrenciyi seç.</div>}
          </Row>

          {/* Yenileme Önizleme */}
          {student && pkg && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div><span className="font-semibold">Önceki Bitiş:</span> {lastEnd || "—"}</div>
                <div><span className="font-semibold">Yeni İlk Ders:</span> {previewStart || "—"}</div>
                <div><span className="font-semibold">Yeni Son Ders:</span> {previewEnd || "—"}</div>
              </div>
              {!lastEnd && <div className="mt-1 text-xs text-amber-700">Bu öğrenci için önceki kayıt bulunamadı. İlk ders, bugünden sonraki ilk uygun hafta gününe backend belirlemeli.</div>}
            </div>
          )}

          {/* Kayıt Geçmişi */}
          {student && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Kayıt Geçmişi</div>
                {loadingHistory && <div className="text-xs text-gray-500">Yükleniyor…</div>}
              </div>
              {history.length === 0 ? (
                <div className="text-gray-600 text-sm">Geçmiş kayıt bulunamadı.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left font-semibold text-gray-800">
                      <tr>
                        <th className="px-3 py-2">Başlangıç</th>
                        <th className="px-3 py-2">Bitiş</th>
                        <th className="px-3 py-2">Paket</th>
                        <th className="px-3 py-2">Seans</th>
                        <th className="px-3 py-2">Ücret</th>
                        <th className="px-3 py-2">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h:any) => (
                        <tr key={h.id} className="border-t">
                          <td className="px-3 py-2">{h.start_date || "—"}</td>
                          <td className="px-3 py-2">{h.end_date || "—"}</td>
                          <td className="px-3 py-2">{h.package_title || h.package_code || h.package_id || "—"}</td>
                          <td className="px-3 py-2">{typeof h.sessions_total === 'number' ? h.sessions_total : (h.duration_days ? Math.round(h.duration_days/7) : "—")}</td>
                          <td className="px-3 py-2">{h.price_at_purchase ? `${h.price_at_purchase} ₺` : "—"}</td>
                          <td className="px-3 py-2">{h.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Metot */}
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
          <Link
            href="/admin/payments"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            İptal
          </Link>
          <button
            disabled={busy || !student || !pkg}
            onClick={save}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Kaydediliyor…" : "Kaydı Yenile / Oluştur"}
          </button>
        </div>
      </div>

      {studentPickerOpen && (
        <StudentPicker
          onClose={() => setStudentPickerOpen(false)}
          onPick={async (x) => {
            setStudent(x);
            setPkg(null); // öğrenci değişirse paketi sıfırla
            await loadLastEnd(x.id);
            setStudentPickerOpen(false);
          }}
        />
      )}

      {packagePickerOpen && (
        <PackagePicker
          onClose={() => setPackagePickerOpen(false)}
          onPick={(p) => {
            setPkg(p);
            setPackagePickerOpen(false);
          }}
        />
      )}
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

/** Basit öğrenci seçici: /api/admin/students/list */
function StudentPicker({ onClose, onPick }: { onClose: () => void; onPick: (x: StudentLite) => void }) {
  const API = "/api/admin/students/list";
  const [items, setItems] = useState<StudentLite[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchList(query: string) {
    setLoading(true);
    setErr(null);
    const url = `${API}?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setErr(j?.error || "Öğrenciler alınamadı");
    const rows = (j.items || []) as StudentLite[];
    rows.sort((a, b) => (a.student_name || "").localeCompare(b.student_name || "", "tr"));
    setItems(rows);
  }

  useEffect(() => { fetchList(""); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchList(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Öğrenci Seç</h3>
          <button onClick={onClose} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50">Kapat</button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList(q)}
            placeholder="İsim / veli / telefon ara…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {err && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 text-sm">{err}</div>}

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-800">
              <tr>
                <th className="px-3 py-2">Öğrenci</th>
                <th className="px-3 py-2">Veli</th>
                <th className="px-3 py-2">Telefon</th>
                <th className="px-3 py-2">Seç</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-700">Yükleniyor…</td></tr>}
              {!loading && items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{x.student_name}</td>
                  <td className="px-3 py-2">{x.parent_name || "—"}</td>
                  <td className="px-3 py-2">{x.parent_phone_e164 || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onPick(x)}
                      className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Seç
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && !err && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-700">Sonuç yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Paket seçici: /api/admin/packages/list */
function PackagePicker({ onClose, onPick }: { onClose: () => void; onPick: (x: PackageLite) => void }) {
  const API = "/api/admin/packages/list";
  const [items, setItems] = useState<PackageLite[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchList(query: string) {
    setLoading(true);
    setErr(null);
    const url = `${API}?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setErr(j?.error || "Paketler alınamadı");
    const rows = (j.items || []) as PackageLite[];
    rows.sort((a, b) => (a.display_name || "").localeCompare(b.display_name || "", "tr"));
    setItems(rows);
  }

  useEffect(() => { fetchList(""); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchList(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Paket Seç</h3>
          <button onClick={onClose} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50">Kapat</button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList(q)}
            placeholder="Paket adı ara…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {err && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 text-sm">{err}</div>}

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-800">
              <tr>
                <th className="px-3 py-2">Paket</th>
                <th className="px-3 py-2">Süre</th>
                <th className="px-3 py-2">Ücret</th>
                <th className="px-3 py-2">Seç</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-700">Yükleniyor…</td></tr>}
              {!loading && items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{x.display_name}</td>
                  <td className="px-3 py-2">{x.duration_days ? `${x.duration_days} gün` : "—"}</td>
                  <td className="px-3 py-2">{typeof (x as any).price === "number" ? `${(x as any).price} ₺` : "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onPick(x)}
                      className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Seç
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && !err && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-700">Sonuç yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
