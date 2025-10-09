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
  duration_days?: number | null; // (valid_weeks || total_sessions || 4) * 7
  price?: number | null;
  is_active?: boolean | null;
};

export default function NewPaymentPage() {
  const router = useRouter();

  // seçilen öğrenci ve paket
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [pkg, setPkg] = useState<PackageLite | null>(null);

  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);

  // form alanları (sade)
  const [form, setForm] = useState<any>({
    method: "card" as PaymentMethod,
    note: "",
  });

  // dönem tarihleri (yalnızca ödemeye dair – yenileme mantığı yok)
  const [startDate, setStartDate] = useState<string>("");       // İlk ders (kullanıcı belirler)
  const [endDate, setEndDate] = useState<string | null>(null);  // Otomatik hesap

  const [busy, setBusy] = useState(false);

  function toYMD(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  function addDaysStr(ymd: string, days: number) {
    const d = new Date(ymd);
    d.setDate(d.getDate() + days);
    return toYMD(d);
  }

  // start veya paket değişince "son ders"i hesapla
  useEffect(() => {
    if (!startDate || !pkg?.duration_days) {
      setEndDate(null);
      return;
    }
    // 1/3/6 aylık mantık: 1 ay = 4 ders → son ders = ilk + (hafta*7 - 1)
    const end = addDaysStr(startDate, Math.max(0, (pkg.duration_days || 0) - 7));
    setEndDate(end);
  }, [startDate, pkg?.duration_days]);

  async function save() {
    if (!student) return alert("Öğrenciyi seç.");
    if (!pkg) return alert("Paketi seç.");
    if (!startDate) return alert("İlk ders tarihini seç.");

    setBusy(true);
    try {
      // Mevcut backend akışına uyuyoruz: renew endpoint’i
      // Not: Backend gerekli gördüğünde tarihleri override edebilir.
      const res = await fetch("/api/admin/studentpackages/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          package_id: pkg.id,
          method: form.method,
          note: form.note || null,
          // sadece ödeme/period bilgisi – SMS/uyarı vs yok
          preview: {
            period_start: startDate,
            period_end: endDate,
          },
          // opsiyonel: ödemeyi "paid" kapatıyoruz (sen istersen burada 'pending' de gönderebilirsin)
          status: "paid",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Kayıt/ödeme oluşturulamadı");

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
          <h1 className="text-2xl font-bold text-gray-900">Yeni Kayıt / Ödeme</h1>
          <p className="text-sm text-gray-700">
            Öğrenci + paket seç; ilk dersi belirle. Son ders otomatik hesaplanır. Yöntemi ve notu ekleyip kaydet.
          </p>
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
                  onClick={() => { setStudent(null); setStartDate(""); setEndDate(null); }}
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
                  onClick={() => { setPkg(null); setEndDate(null); }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Temizle
                </button>
              )}
            </div>
            {!student && <div className="mt-2 text-xs text-amber-700">Paket aramak için önce öğrenciyi seç.</div>}
          </Row>

          {/* Dönem tarihleri */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="İlk Ders *">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </Row>
            <Row label="Son Ders (otomatik)">
              <input
                readOnly
                value={endDate || ""}
                placeholder="Paket seçince hesaplanır"
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
              />
            </Row>
          </div>

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

          {/* Not */}
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
            disabled={busy || !student || !pkg || !startDate}
            onClick={save}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {studentPickerOpen && (
        <StudentPicker
          onClose={() => setStudentPickerOpen(false)}
          onPick={(x) => {
            setStudent(x);
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

/** Öğrenci seçici: /api/admin/students/list */
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

/** Paket seçici: /api/packages/list */
function PackagePicker({ onClose, onPick }: { onClose: () => void; onPick: (x: PackageLite) => void }) {
  const API = "/api/packages/list";
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

    // /api/packages/list hem dizi hem {items:[]} dönebilsin diye esnekçe parse edelim
    const raw = Array.isArray(j) ? j : (j.items || []);
    const rows = (raw || []).map((x: any) => {
      const weeks =
        (typeof x.valid_weeks === "number" && x.valid_weeks > 0 ? x.valid_weeks : null) ??
        (typeof x.total_sessions === "number" && x.total_sessions > 0 ? x.total_sessions : null) ??
        4;
      return {
        id: x.id,
        display_name: x.title || x.code || "Paket",
        duration_days: weeks * 7,
        price: x.total_price ? Number(x.total_price) : null,
        is_active: typeof x.is_active === "boolean" ? x.is_active : true,
      } as PackageLite;
    }).filter((p: PackageLite) => p.is_active !== false);

    rows.sort((a: { display_name: any; }, b: { display_name: any; }) => (a.display_name || "").localeCompare(b.display_name || "", "tr"));
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
                  <td className="px-3 py-2">{typeof x.price === "number" ? `${x.price} ₺` : "—"}</td>
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