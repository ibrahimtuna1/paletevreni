"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Pkg = { id: string; title: string; total_price: number; total_sessions: number; valid_weeks: number|null };
type Stud = { id: string; student_name: string };

const fmt = (d?: string|null) => d ? new Date(d).toLocaleDateString("tr-TR") : "—";
const addDays = (iso: string, days: number) => {
  const d = new Date(iso); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
};

export default function RenewNew() {
  const sp = useSearchParams();
  const router = useRouter();
  const presetStudent = sp.get("studentId") || "";
  const [students, setStudents] = useState<Stud[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [form, setForm] = useState({ student_id: presetStudent, package_id: "", method: "transfer", status: "paid", note: "" });

  const [preview, setPreview] = useState<{last?: string; start?: string; end?: string}>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // öğrenciler
      const rs = await fetch("/api/admin/students/list", { cache: "no-store" }); // senin güncel route’un
      const sj = await rs.json();
      setStudents((sj.items || []).map((x:any)=>({ id:x.id, student_name:x.student_name })));
      // paketler
      const rp = await fetch("/api/packages/list", { cache: "no-store" });
      const pj = await rp.json();
      setPackages((pj || []).map((x:any)=>({
        id: x.id, title: x.title, total_price: Number(x.total_price),
        total_sessions: x.total_sessions, valid_weeks: x.valid_weeks ?? null
      })));
    })();
  }, []);

  // önizleme (öğrencinin en son dönemine göre)
  useEffect(() => {
    async function calc() {
      setPreview({});
      if (!form.student_id || !form.package_id) return;

      // öğrencinin en yeni dönemi
      const r = await fetch(`/api/admin/studentpackages/last?student_id=${form.student_id}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.item) return;

      const sp = j.item; // { start_date, package: { valid_weeks/total_sessions } }
      const weeksOld = sp.package?.valid_weeks ?? sp.sessions_total ?? 4;
      const last = sp.start_date ? addDays(sp.start_date, Math.max(0, weeksOld*7 - 1)) : null;

      const pkg = packages.find(p => p.id === form.package_id);
      const weeksNew = pkg?.valid_weeks ?? pkg?.total_sessions ?? 4;
      const start = last ? addDays(last, 7) : null;
      const end = start ? addDays(start, Math.max(0, weeksNew*7 - 1)) : null;
      setPreview({ last: last || undefined, start: start || undefined, end: end || undefined });
    }
    calc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.student_id, form.package_id, packages.length]);

  async function submit() {
    if (!form.student_id || !form.package_id) return alert("Öğrenci ve paket seçin.");
    setLoading(true);
    const res = await fetch("/api/admin/renewals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) return alert(j?.error || "Yenileme yapılamadı");
    router.push("/admin/renewals");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kayıt Yenile</h1>
        <p className="text-sm text-gray-700">Öğrenci ve yeni paketi seç; tarihleri sistem hesaplar.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-gray-900">Öğrenci</div>
            <select
              value={form.student_id}
              onChange={(e)=>setForm(f=>({ ...f, student_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Seçin…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_name}</option>)}
            </select>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-900">Paket</div>
            <select
              value={form.package_id}
              onChange={(e)=>setForm(f=>({ ...f, package_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Seçin…</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-gray-900">Yöntem</div>
            <select
              value={form.method}
              onChange={(e)=>setForm(f=>({ ...f, method: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="card">Kart</option>
              <option value="cash">Nakit</option>
              <option value="transfer">Havale/EFT</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Durum</div>
            <select
              value={form.status}
              onChange={(e)=>setForm(f=>({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="paid">Ödendi</option>
              <option value="pending">Bekliyor</option>
              <option value="failed">Başarısız</option>
              <option value="refunded">İade</option>
            </select>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-900">Not</div>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e)=>setForm(f=>({ ...f, note: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-900">
          <div>Önceki Son Ders: <b>{fmt(preview.last)}</b></div>
          <div>Yeni İlk Ders: <b>{fmt(preview.start)}</b></div>
          <div>Yeni Son Ders: <b>{fmt(preview.end)}</b></div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={()=>history.back()} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">İptal</button>
          <button disabled={loading || !form.student_id || !form.package_id} onClick={submit}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {loading ? "Kaydediliyor…" : "Yenile"}
          </button>
        </div>
      </div>
    </div>
  );
}