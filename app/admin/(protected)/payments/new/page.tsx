// app/admin/(protected)/payments/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PaymentMethod = "card" | "cash" | "transfer";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

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
    amount: "",
    method: "card" as PaymentMethod,
    status: "pending" as PaymentStatus,
    paid_at: "",
    period_start: new Date().toISOString().slice(0, 10),
    period_end: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  async function ensureStudentPackageId(): Promise<string> {
    // varolan bir student_packages var mı diye sormak istersen
    // ileride /api/admin/student-packages/find?student_id=&package_id= gibi bir endpoint eklenebilir.
    // Şimdilik direkt create deniyoruz; backend "unique" varsa döndürür, yoksa oluşturur.

    const res = await fetch("/api/admin/studentpackages/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: student!.id,
        package_id: pkg!.id,
        // opsiyonel alanlar:
        start_date: form.period_start || new Date().toISOString().slice(0, 10),
        price_at_purchase: form.amount ? Number(form.amount) : null,
        status: "active",
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "student_packages oluşturulamadı");
    return j.id as string;
  }

  async function save() {
    if (!student) return alert("Öğrenciyi seç.");
    if (!pkg) return alert("Paketi seç.");
    if (!form.amount) return alert("Tutar zorunlu");

    setBusy(true);
    try {
      const student_package_id = await ensureStudentPackageId();

      const payload = {
        student_package_id,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        note: form.note || null,
      };

      const res = await fetch("/api/admin/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Ödeme kaydı oluşturulamadı");

      router.push("/admin/payments");
    } catch (e: any) {
      alert(e.message || "Hata");
    } finally {
      setBusy(false);
    }
  }

  // paket seçildiğinde vade alanını hafifçe doldurmak istersen (opsiyonel)
  useEffect(() => {
    if (pkg?.duration_days && form.period_start) {
      const d0 = new Date(form.period_start);
      const d1 = new Date(d0);
      d1.setDate(d1.getDate() + (pkg.duration_days || 0));
      setForm((f: any) => ({ ...f, period_end: d1.toISOString().slice(0, 10) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg?.duration_days, form.period_start]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Ödeme</h1>
          <p className="text-sm text-gray-700">Öğrenci + paket seç, detayları gir, kaydet.</p>
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

          {/* Tutar / Metot / Durum */}
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

          {/* Dönem */}
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
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {studentPickerOpen && (
        <StudentPicker
          onClose={() => setStudentPickerOpen(false)}
          onPick={(x) => {
            setStudent(x);
            setPkg(null); // öğrenci değişirse paketi sıfırla
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
                <th className="px-3 py-2">Seç</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-700">Yükleniyor…</td></tr>}
              {!loading && items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{x.display_name}</td>
                  <td className="px-3 py-2">{x.duration_days ? `${x.duration_days} gün` : "—"}</td>
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
                <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-700">Sonuç yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
