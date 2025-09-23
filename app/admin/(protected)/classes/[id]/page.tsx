"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/** ====== Types ====== */
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

type Klass = {
  id: string;
  name: string;
  capacity: number;
  member_count: number;
  meeting_days?: string | null; // ör: "Pzt,Çar" veya "Mon,Wed"
};

type AttendanceRow = {
  student_id: string;
  status: "present" | "absent" | "excused";
  makeup_date?: string | null;
};

/** ====== Helpers ====== */
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const badgeTone: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-900",
  rose: "bg-rose-100 text-rose-900",
  amber: "bg-amber-100 text-amber-900",
  indigo: "bg-indigo-100 text-indigo-900",
  gray: "bg-gray-100 text-gray-900",
};

const btnBase =
  "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:opacity-60";
const btnGhost = "border-gray-300 bg-white hover:bg-gray-50 text-gray-900";
const btnPrimary = "border-black bg-black text-white hover:opacity-90";
const btnIndigo = "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700";
const chip = "rounded-full px-2 py-0.5 text-xs font-semibold";

/** Hafta araçları */
const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const; // Mon-first
function mondayStart(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 .. Sun=6
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function fmtDateTR(d: Date) {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}
function parseFirstMeetingDow(meeting_days?: string | null): number | null {
  if (!meeting_days) return null;
  const s = meeting_days.toLowerCase();
  // kaba eşleştirme
  const map: Record<string, number> = {
    pzt: 0,
    pazartesi: 0,
    mon: 0,
    sal: 1,
    salı: 1,
    tue: 1,
    çar: 2,
    car: 2,
    carsamba: 2,
    wed: 2,
    per: 3,
    perşembe: 3,
    persembe: 3,
    thu: 3,
    cum: 4,
    cuma: 4,
    fri: 4,
    cmt: 5,
    cumartesi: 5,
    sat: 5,
    paz: 6,
    pazar: 6,
    sun: 6,
  };
  for (const token of s.split(/[ ,/|]+/)) {
    const key = token.normalize("NFKD").replace(/[^a-z]/g, "");
    for (const [k, v] of Object.entries(map)) {
      if (key.startsWith(k)) return v;
    }
  }
  return null;
}

export default function ClassDetailPage() {
  const { id } = useParams() as { id: string };

  const [klass, setKlass] = useState<Klass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // sınıfa mesaj
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("Dersimiz başladı. Zoom linkimiz: ...");
  const [msgBusy, setMsgBusy] = useState(false);

  // öğrenci detay modal
  const [modalId, setModalId] = useState<string | null>(null);

  // yoklama
  const [attLoading, setAttLoading] = useState(false);
  const [attBusy, setAttBusy] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>({}); // student_id -> row

  // Hafta gezgini
  const [weekShift, setWeekShift] = useState<number>(0); // 0=bu hafta, -1=geçen, +1=gelecek
  const [activeDow, setActiveDow] = useState<number>(() => {
    // Başlangıç: bugün ya da sınıf günlerinden ilki
    const dowToday = (new Date().getDay() + 6) % 7; // 0..6 Mon-first
    return dowToday;
  });

  const weekStart = useMemo(() => mondayStart(new Date(new Date().toDateString())), [weekShift]);
  const currentDay = useMemo(() => addDays(weekStart, activeDow + 7 * weekShift), [weekStart, activeDow, weekShift]);
  const dateISO = useMemo(() => toISODate(currentDay), [currentDay]);

  /** ====== Data ====== */
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
      const items = (sJson.items ?? []) as Student[];
      setStudents(items);

      // Sınıf toplantı gününe göre default günü ayarla (varsa)
      const md = parseFirstMeetingDow(found?.meeting_days);
      if (md !== null) setActiveDow(md);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAttendance(iso: string) {
    setAttLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance/list?classId=${id}&date=${iso}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Yoklama alınamadı");
      const map: Record<string, AttendanceRow> = {};
      for (const row of j.items ?? []) {
        map[row.student_id] = { student_id: row.student_id, status: row.status, makeup_date: row.makeup_date || null };
      }
      setAttendance(map);
    } catch (e: any) {
      alert(e.message || "Yoklama alınamadı");
    } finally {
      setAttLoading(false);
    }
  }
  useEffect(() => {
    loadAttendance(dateISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO, id]);

  /** ====== Mutations ====== */
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

  function setStatus(studentId: string, status: AttendanceRow["status"]) {
    setAttendance((m) => ({ ...m, [studentId]: { student_id: studentId, status, makeup_date: m[studentId]?.makeup_date || null } }));
  }
  function setMakeup(studentId: string, makeup_date: string | null) {
    setAttendance((m) => ({ ...m, [studentId]: { student_id: studentId, status: m[studentId]?.status || "absent", makeup_date } }));
  }
  function bulkSet(status: AttendanceRow["status"]) {
    const map: Record<string, AttendanceRow> = { ...attendance };
    for (const s of students) {
      if (s.status !== "active") continue;
      map[s.id] = { student_id: s.id, status, makeup_date: map[s.id]?.makeup_date || null };
    }
    setAttendance(map);
  }

  async function saveAttendance() {
    setAttBusy(true);
    try {
      const items: AttendanceRow[] = students
        .filter((s) => s.status === "active")
        .map((s) => attendance[s.id])
        .filter(Boolean) as AttendanceRow[];

      const res = await fetch("/api/admin/attendance/bulk_upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: id, date: dateISO, items }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Yoklama kaydedilemedi");
      alert("Yoklama kaydedildi");
      await loadAttendance(dateISO);
    } catch (e: any) {
      alert(e.message || "Kaydedilemedi");
    } finally {
      setAttBusy(false);
    }
  }

  /** ====== Derived ====== */
  const headerRight = useMemo(() => {
    if (!klass) return null;
    const full = klass.member_count >= klass.capacity;
    return (
      <div className="flex items-center gap-2">
        <span className={cn(chip, full ? badgeTone.rose : badgeTone.emerald)}>
          {full ? "DOLU" : "Müsait"} {klass.member_count}/{klass.capacity}
        </span>
        {klass.meeting_days && <span className={cn(chip, badgeTone.indigo)}>{klass.meeting_days}</span>}
      </div>
    );
  }, [klass]);

  const attStats = useMemo(() => {
    let present = 0,
      absent = 0,
      excused = 0;
    for (const s of students) {
      const st = attendance[s.id]?.status;
      if (st === "present") present++;
      else if (st === "excused") excused++;
      else if (st === "absent") absent++;
    }
    return { present, absent, excused };
  }, [attendance, students]);

  const weekTitle = useMemo(() => {
    const start = addDays(weekStart, 7 * weekShift);
    const end = addDays(start, 6);
    const dayName = TR_DAYS[activeDow];
    return `${fmtDateTR(start)} – ${fmtDateTR(end)} • ${dayName}`;
  }, [weekStart, weekShift, activeDow]);

  /** ====== UI ====== */
  return (
    <div className="space-y-6 text-gray-900 font-sans antialiased">
      {/* Header */}
      <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-sky-50 to-fuchsia-50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/admin/students" className="text-sm text-indigo-700/80 hover:underline">
              ← Geri
            </Link>
            <motion.h1
              className="mt-1 text-2xl font-bold tracking-tight text-gray-950"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {klass?.name || "Sınıf"}
            </motion.h1>
            <p className="text-sm text-gray-800">Bu sınıfa bağlı öğrenciler ve yoklama/plan bilgileri.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMsgOpen((s) => !s)}
              className={cn(btnBase, "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50")}
            >
              Sınıfa Mesaj Gönder
            </button>
            {headerRight}
          </div>
        </div>

        {/* Hafta gezgini */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekShift((x) => x - 1)} className={cn(btnBase, btnGhost)}>
              ← Geçen Hafta
            </button>
            <button onClick={() => setWeekShift(0)} className={cn(btnBase, btnGhost)}>
              Bu Hafta
            </button>
            <button onClick={() => setWeekShift((x) => x + 1)} className={cn(btnBase, btnGhost)}>
              Sonraki Hafta →
            </button>
          </div>
          <div className="text-sm font-semibold text-indigo-900">{weekTitle}</div>
          <div className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-white p-1">
            {TR_DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setActiveDow(i)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs",
                  i === activeDow ? "bg-indigo-600 text-white" : "text-indigo-700 hover:bg-indigo-50"
                )}
                aria-label={`Gün: ${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Haftalık Yoklama Card ---- */}
      <motion.div
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-900">
              Yoklama tarihi: <b>{currentDay.toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" })}</b>
            </span>
            <AnimatePresence>
              {attLoading && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                  Yükleniyor…
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn(chip, badgeTone.emerald)}>Geldi: {attStats.present}</span>
            <span className={cn(chip, badgeTone.amber)}>Mazeretli: {attStats.excused}</span>
            <span className={cn(chip, badgeTone.rose)}>Gelmedi: {attStats.absent}</span>
          </div>
        </div>

        {/* tools (SEÇİM YOK) */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={() => bulkSet("present")} className={cn(btnBase, btnGhost)}>Tümünü Geldi</button>
          <button onClick={() => bulkSet("absent")} className={cn(btnBase, btnGhost)}>Tümünü Gelmedi</button>
          <button onClick={() => bulkSet("excused")} className={cn(btnBase, btnGhost)}>Tümünü Mazeretli</button>

          <div className="ml-auto flex gap-2">
            <button disabled={attBusy} onClick={saveAttendance} className={cn(btnBase, btnPrimary)}>
              {attBusy ? "Kaydediliyor…" : "Yoklamayı Kaydet"}
            </button>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full">
            <thead className="sticky top-0 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Öğrenci</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Telafi Tarihi (ops.)</th>
              </tr>
            </thead>
            <tbody className="text-[15px]">
              {students
                .filter((s) => s.status === "active")
                .map((s, i) => (
                  <tr key={s.id} className={i % 2 ? "bg-gray-50/40" : ""}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-950">{s.student_name}</div>
                      <div className="text-xs text-gray-700">{s.parent_name} • {s.parent_phone_e164}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        {(["present", "absent", "excused"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setStatus(s.id, opt)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                              attendance[s.id]?.status === opt
                                ? opt === "present"
                                  ? "border-emerald-700 bg-emerald-600 text-white"
                                  : opt === "excused"
                                  ? "border-amber-700 bg-amber-600 text-white"
                                  : "border-rose-700 bg-rose-600 text-white"
                                : "border-gray-300 bg-white hover:bg-gray-50"
                            )}
                          >
                            {opt === "present" ? "Geldi" : opt === "excused" ? "Mazeretli" : "Gelmedi"}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={attendance[s.id]?.makeup_date ?? ""}
                        onChange={(e) => setMakeup(s.id, e.target.value || null)}
                        className="w-44 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm placeholder-gray-600 focus:border-black focus:ring-black/20"
                      />
                    </td>
                  </tr>
                ))}
              {students.filter((s) => s.status === "active").length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center">
                    Aktif öğrenci yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ---- Sınıfa Mesaj ---- */}
      <AnimatePresence>
        {msgOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"
          >
            <textarea
              rows={3}
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm placeholder-gray-600 focus:border-indigo-500 focus:ring-indigo-300"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setMsgOpen(false)} className={cn(btnBase, btnGhost)}>
                Kapat
              </button>
              <button disabled={msgBusy} onClick={sendToClass} className={cn(btnBase, btnIndigo)}>
                {msgBusy ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">{err}</div>}

      {/* ---- Öğrenci Listesi (detay) ---- */}
      <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm text-gray-900">
          <span className="font-semibold">Öğrenci Detayları</span>
          <span className="text-xs text-gray-600 group-open:hidden">(Aç)</span>
          <span className="text-xs text-gray-600 hidden group-open:inline">(Kapat)</span>
        </summary>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="min-w-full">
            <thead className="sticky top-0 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide">
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
            <tbody className="text-[15px]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading &&
                students.map((s, i) => (
                  <tr key={s.id} className={i % 2 ? "bg-gray-50/40" : ""}>
                    <td className="px-4 py-3">
                      <button onClick={() => setModalId(s.id)} className="font-semibold underline-offset-2 hover:underline">
                        {s.student_name}
                      </button>
                      <div className="text-[13px] text-gray-700">Kayıt: {new Date(s.created_at).toLocaleDateString("tr-TR")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{s.parent_name}</div>
                      <div className="text-gray-700">{s.parent_phone_e164}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={s.start_date ?? ""}
                        onChange={(e) => patch(s.id, { start_date: e.target.value || null })}
                        className="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm placeholder-gray-600 focus:border-black focus:ring-black/20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={s.end_date ?? ""}
                        onChange={(e) => patch(s.id, { end_date: e.target.value || null })}
                        className="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm placeholder-gray-600 focus:border-black focus:ring-black/20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!s.trial_attended}
                          onChange={(e) => patch(s.id, { trial_attended: e.target.checked })}
                        />
                        <span className={s.trial_attended ? "text-emerald-700" : ""}>{s.trial_attended ? "Katıldı" : "—"}</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.attendance_status ?? "absent"}
                        onChange={(e) => patch(s.id, { attendance_status: e.target.value as any })}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-black focus:ring-black/20"
                      >
                        <option value="present">Geldi</option>
                        <option value="absent">Gelmedi</option>
                        <option value="excused">Mazeretli</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          chip,
                          s.status === "active" ? badgeTone.emerald : s.status === "paused" ? badgeTone.amber : badgeTone.rose
                        )}
                      >
                        {s.status === "active" ? "Aktif" : s.status === "paused" ? "Askıda" : "Ayrıldı"}
                      </span>
                    </td>
                  </tr>
                ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    Bu sınıfta öğrenci yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      {/* ---- Öğrenci modal ---- */}
      <AnimatePresence>
        {modalId && (() => {
          const s = students.find((x) => x.id === modalId)!;
          return (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.6 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{s.student_name}</h3>
                  <button onClick={() => setModalId(null)} className={cn(btnBase, btnGhost, "px-2 py-1 text-xs")}>
                    Kapat
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <Row k="Veli">{s.parent_name}</Row>
                  <Row k="Telefon">{s.parent_phone_e164}</Row>
                  <Row k="Kayıt">{new Date(s.created_at).toLocaleDateString("tr-TR")}</Row>
                  <Row k="Başlangıç">
                    <input
                      type="date"
                      value={s.start_date ?? ""}
                      onChange={(e) => patch(s.id, { start_date: e.target.value || null })}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1"
                    />
                  </Row>
                  <Row k="Bitiş">
                    <input
                      type="date"
                      value={s.end_date ?? ""}
                      onChange={(e) => patch(s.id, { end_date: e.target.value || null })}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1"
                    />
                  </Row>
                  <Row k="Deneme">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!s.trial_attended}
                        onChange={(e) => patch(s.id, { trial_attended: e.target.checked })}
                      />
                      <span>{s.trial_attended ? "Katıldı" : "—"}</span>
                    </label>
                  </Row>
                  <Row k="Yoklama">
                    <select
                      value={s.attendance_status ?? "absent"}
                      onChange={(e) => patch(s.id, { attendance_status: e.target.value as any })}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1"
                    >
                      <option value="present">Geldi</option>
                      <option value="absent">Gelmedi</option>
                      <option value="excused">Mazeretli</option>
                    </select>
                  </Row>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/** ====== Small bits ====== */
function Row({ k, children }: any) {
  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <div className="col-span-1 text-gray-800">{k}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}
