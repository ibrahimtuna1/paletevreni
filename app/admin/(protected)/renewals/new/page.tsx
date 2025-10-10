"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Pkg = { id: string; title: string; total_price: number; total_sessions: number; };
type Stud = { id: string; student_name: string };

const fmt = (d?: string|null) => d ? new Date(d).toLocaleDateString("tr-TR") : "—";
const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function RenewNew() {
  const sp = useSearchParams();
  const router = useRouter();
  
  const studentId = sp.get("studentId") || "";
  const lastEndDate = sp.get("lastEndDate") || null;

  const [students, setStudents] = useState<Stud[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [form, setForm] = useState({
    student_id: studentId,
    package_id: "",
    method: "havale_eft",
    note: "",
    start_date: ""
  });
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
const defaultStartDate = lastEndDate ? addDays(lastEndDate, 7) : new Date().toISOString().slice(0, 10);    const startDate = form.start_date || defaultStartDate;
    
    const pkg = packages.find(p => p.id === form.package_id);
    if (!pkg) return { last: lastEndDate, start: startDate, end: undefined };
    
    // DÜZELTME: Formül (total_sessions - 1) * 7 olarak güncellendi.
    const endDate = addDays(startDate, Math.max(0, (pkg.total_sessions - 1) * 7));

    return { last: lastEndDate, start: startDate, end: endDate };
  }, [form.package_id, form.start_date, packages, lastEndDate]);
  
  useEffect(() => {
    if (preview.start && !form.start_date) {
      setForm(f => ({ ...f, start_date: preview.start! }));
    }
  }, [preview.start, form.start_date]);

  useEffect(() => {
    (async () => {
      const rs = await fetch("/api/admin/students/list", { cache: "no-store" });
      const sj = await rs.json();
      setStudents((sj.items || []).map((x:any) => ({ id:x.id, student_name:x.student_name })));
      
      const rp = await fetch("/api/packages/list", { cache: "no-store" });
      const pj = await rp.json();
      setPackages((pj || []).map((x:any) => ({
        id: x.id, title: x.title, total_price: Number(x.total_price),
        total_sessions: x.total_sessions
      })));
    })();
  }, []);

  async function submit() {
    if (!form.student_id || !form.package_id) return alert("Öğrenci ve paket seçin.");
    
    const submissionData = { ...form, start_date: form.start_date };

    setLoading(true);
    const res = await fetch("/api/admin/renewals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return alert(j?.error || "Yenileme yapılamadı");
    router.push("/admin/renewals");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kayıt Yenile</h1>
        <p className="text-sm text-gray-700">Öğrenci ve yeni paketi seç; tarihleri sistem hesaplar veya kendin belirle.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
                <div className="text-sm font-medium text-gray-900">Öğrenci</div>
                <select
                value={form.student_id}
                onChange={(e) => setForm(f => ({ ...f, student_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                disabled={!!studentId}
                >
                <option value="">Seçin…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.student_name}</option>)}
                </select>
            </div>

            <div>
                <div className="text-sm font-medium text-gray-900">Paket</div>
                <select
                value={form.package_id}
                onChange={(e) => setForm(f => ({ ...f, package_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                <option value="">Seçin…</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </div>
        </div>

        <div>
            <div className="text-sm font-medium text-gray-900">İlk Ders Tarihi (Opsiyonel)</div>
            <input 
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Boş bırakırsanız, sistem otomatik olarak bir önceki paketin bitişinden sonraki günü atar.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
            <div>
                <div className="text-sm font-medium text-gray-900">Yöntem</div>
                <select
                value={form.method}
                onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                    <option value="havale_eft">Havale/EFT</option>
                    <option value="kart">Kart</option>
                    <option value="nakit">Nakit</option>
                </select>
            </div>
        </div>

        <div>
            <div className="text-sm font-medium text-gray-900">Not</div>
            <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-900">
          <div>Önceki Son Ders: <b>{fmt(preview.last)}</b></div>
          <div>Yeni İlk Ders: <b>{fmt(preview.start)}</b></div>
          <div>Yeni Son Ders: <b>{fmt(preview.end)}</b></div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => router.back()} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">İptal</button>
          <button disabled={loading || !form.student_id || !form.package_id} onClick={submit}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {loading ? "Kaydediliyor…" : "Yenile"}
          </button>
        </div>
      </div>
    </div>
  );
}