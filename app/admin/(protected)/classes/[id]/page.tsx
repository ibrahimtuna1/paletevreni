// app/admin/(protected)/classes/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Student = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone_e164: string;
  status: "active" | "paused" | "left";
  start_date: string | null;
  end_date: string | null;
  trial_attended: boolean;
  attendance_status: "present" | "absent" | "excused" | null;
  admin_note: string | null;
  created_at: string;
};

type Klass = { id: string; name: string; capacity: number; member_count: number; meeting_days?: string | null; };

export default function ClassDetailPage() {
  const { id } = useParams() as { id: string };
  const [klass, setKlass] = useState<Klass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // mesaj UI
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("Dersimiz başladı. Zoom linkimiz: ...");
  const [msgBusy, setMsgBusy] = useState(false);

  // öğrenci modal
  const [modalId, setModalId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/admin/classes/list", { cache: "no-store" }),
        fetch(`/api/admin/students/list?classId=${id}`, { cache: "no-store" }),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      if (!cRes.ok) throw new Error(cJson?.error || "Sınıf alınamadı");
      if (!sRes.ok) throw new Error(sJson?.error || "Öğrenciler alınamadı");
      const found = (cJson.items ?? []).find((x: any) => x.id === id) || null;
      setKlass(found);
      setStudents((sJson.items ?? []) as Student[]);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function patch(id: string, p: Partial<Student>) {
    const prev = [...students];
    setStudents((xs) => xs.map((s) => (s.id === id ? { ...s, ...p } : s)));
    const res = await fetch("/api/admin/students/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...p }),
    });
    if (!res.ok) {
      setStudents(prev);
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Kaydedilemedi");
    }
  }

  async function sendToClass() {
    setMsgBusy(true);
    const res = await fetch("/api/admin/classes/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: id, body: msgText }),
    });
    const j = await res.json().catch(() => ({}));
    setMsgBusy(false);
    if (!res.ok) return alert(j?.error || "Mesaj gönderilemedi");
    setMsgOpen(false);
  }

  const headerRight = useMemo(() => {
    if (!klass) return null;
    const full = klass.member_count >= klass.capacity;
    return (
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${full ? "bg-rose-200 text-rose-900" : "bg-emerald-200 text-emerald-900"}`}>
          {full ? "DOLU" : "Müsait"} {klass.member_count}/{klass.capacity}
        </span>
        {klass.meeting_days && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">{klass.meeting_days}</span>}
      </div>
    );
  }, [klass]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/students" className="text-sm text-gray-600 hover:underline">← Geri</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{klass?.name || "Sınıf"}</h1>
          <p className="text-sm text-gray-700">Bu sınıfa bağlı öğrenciler ve yoklama/plan bilgileri.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMsgOpen((s) => !s)} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">Sınıfa Mesaj Gönder</button>
          {headerRight}
        </div>
      </div>

      {msgOpen && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <textarea rows={3} value={msgText} onChange={(e)=>setMsgText(e.target.value)} className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={()=>setMsgOpen(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">Kapat</button>
            <button disabled={msgBusy} onClick={sendToClass} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{msgBusy ? "Gönderiliyor…" : "Gönder"}</button>
          </div>
        </div>
      )}

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      {/* Liste */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
            <tr>
              <th className="px-4 py-3">Öğrenci</th>
              <th className="px-4 py-3">Veli / Tel</th>
              <th className="px-4 py-3">Başlangıç</th>
              <th className="px-4 py-3">Bitiş</th>
              <th className="px-4 py-3">Deneme</th>
              <th className="px-4 py-3">Yoklama</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="text-[15px] text-gray-900">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-700">Yükleniyor…</td></tr>
            )}
            {!loading && students.map((s, i) => (
              <tr key={s.id} className={i % 2 ? "bg-gray-50/40" : ""}>
                <td className="px-4 py-3">
                  <button onClick={()=>setModalId(s.id)} className="font-semibold text-gray-900 hover:underline">
                    {s.student_name}
                  </button>
                  <div className="text-[13px] text-gray-700">Kayıt: {new Date(s.created_at).toLocaleDateString("tr-TR")}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{s.parent_name}</div>
                  <div className="text-gray-700">{s.parent_phone_e164}</div>
                </td>
                <td className="px-4 py-3">
                  <input type="date" value={s.start_date ?? ""} onChange={(e)=>patch(s.id, { start_date: e.target.value || null })} className="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-3">
                  <input type="date" value={s.end_date ?? ""} onChange={(e)=>patch(s.id, { end_date: e.target.value || null })} className="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!s.trial_attended} onChange={(e)=>patch(s.id, { trial_attended: e.target.checked })} />
                    <span className={s.trial_attended ? "text-emerald-700" : "text-gray-700"}>
                      {s.trial_attended ? "Katıldı" : "—"}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-3">
                  <select value={s.attendance_status ?? "absent"} onChange={(e)=>patch(s.id, { attendance_status: e.target.value as any })} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm">
                    <option value="present">Geldi</option>
                    <option value="absent">Gelmedi</option>
                    <option value="excused">Mazeretli</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.status === "active" ? "bg-emerald-100 text-emerald-900"
                    : s.status === "paused" ? "bg-amber-100 text-amber-900"
                    : "bg-rose-100 text-rose-900"
                  }`}>
                    {s.status === "active" ? "Aktif" : s.status === "paused" ? "Askıda" : "Ayrıldı"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && students.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-700">Bu sınıfta öğrenci yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Öğrenci modal (tek öğrenci görünümü) */}
      {modalId && (() => {
        const s = students.find(x => x.id === modalId)!;
        return (
          <Modal onClose={()=>setModalId(null)} title={s.student_name}>
            <div className="space-y-3 text-sm text-gray-900">
              <Row k="Veli">{s.parent_name}</Row>
              <Row k="Telefon">{s.parent_phone_e164}</Row>
              <Row k="Kayıt">{new Date(s.created_at).toLocaleDateString("tr-TR")}</Row>
              <Row k="Başlangıç">
                <input type="date" value={s.start_date ?? ""} onChange={(e)=>patch(s.id, { start_date: e.target.value || null })} className="rounded-lg border border-gray-300 bg-white px-2 py-1" />
              </Row>
              <Row k="Bitiş">
                <input type="date" value={s.end_date ?? ""} onChange={(e)=>patch(s.id, { end_date: e.target.value || null })} className="rounded-lg border border-gray-300 bg-white px-2 py-1" />
              </Row>
              <Row k="Deneme">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!s.trial_attended} onChange={(e)=>patch(s.id, { trial_attended: e.target.checked })} />
                  <span>{s.trial_attended ? "Katıldı" : "—"}</span>
                </label>
              </Row>
              <Row k="Yoklama">
                <select value={s.attendance_status ?? "absent"} onChange={(e)=>patch(s.id, { attendance_status: e.target.value as any })} className="rounded-lg border border-gray-300 bg-white px-2 py-1">
                  <option value="present">Geldi</option>
                  <option value="absent">Gelmedi</option>
                  <option value="excused">Mazeretli</option>
                </select>
              </Row>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50">Kapat</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Row({ k, children }: any) {
  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <div className="col-span-1 text-gray-700">{k}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}
