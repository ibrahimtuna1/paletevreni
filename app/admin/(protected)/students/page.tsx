// app/admin/(protected)/students/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Klass = {
  id: string;
  name: string;
  capacity: number;
  member_count: number;
  meeting_days?: string | null;
};

type Student = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone_e164: string;
  status: "active" | "paused" | "left";
  class_id: string | null;
  class_name: string | null;
  created_at: string;
};

export default function StudentsOverviewPage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // sınıf modal state (create/edit)
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editing, setEditing] = useState<Klass | null>(null);
  const [cName, setCName] = useState("");
  const [cCap, setCCap] = useState("14");
  const [cDays, setCDays] = useState("");
  const [busy, setBusy] = useState(false);

  // --- öğrenci filtre/atama UI state ---
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | "unassigned" | string>("all"); // string -> classId
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<string>(""); // hedef classId
  const [bulkBusy, setBulkBusy] = useState(false);

  // --- YENİ: durum sekmesi (ikinci sayfa gibi) ---
  // tabs: "Aktif", "Askıda", "Ayrıldı", "Aktif Olmayanlar", "Tümü"
  type StatusTab = "active" | "paused" | "left" | "inactive" | "all";
  const [statusTab, setStatusTab] = useState<StatusTab>("active");

  async function loadAll() {
    setErr(null);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/admin/classes/list", { cache: "no-store" }),
        fetch("/api/admin/students/list", { cache: "no-store" }),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      if (!cRes.ok) throw new Error(cJson?.error || "Sınıflar alınamadı");
      if (!sRes.ok) throw new Error(sJson?.error || "Öğrenciler alınamadı");
      setClasses(cJson.items ?? []);
      setStudents((sJson.items ?? []) as Student[]);
      setSelectedIds(new Set());
    } catch (e: any) {
      setErr(e.message || "Hata");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totals = useMemo(() => {
    const all = students.length;
    const active = students.filter((s) => s.status === "active").length;
    const paused = students.filter((s) => s.status === "paused").length;
    const left = students.filter((s) => s.status === "left").length;
    return { all, active, paused, left, cls: classes.length };
  }, [students, classes]);

  function openCreate() {
    setEditing(null);
    setCName("");
    setCCap("14");
    setCDays("");
    setClassModalOpen(true);
  }
  function openEdit(k: Klass) {
    setEditing(k);
    setCName(k.name);
    setCCap(String(k.capacity));
    setCDays(k.meeting_days || "");
    setClassModalOpen(true);
  }

  async function saveClass() {
    if (!cName.trim()) return alert("Sınıf adı zorunlu");
    const cap = Number(cCap);
    if (!Number.isFinite(cap) || cap <= 0) return alert("Kapasite pozitif olmalı");
    setBusy(true);
    const body = { name: cName.trim(), capacity: cap, meeting_days: cDays.trim() || null };
    const url = editing ? "/api/admin/classes/update" : "/api/admin/classes/create";
    const method = editing ? "PATCH" : "POST";
    const payload = editing ? { id: editing.id, ...body } : body;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j?.error || "Kaydedilemedi");
    setClassModalOpen(false);
    loadAll();
  }

  async function deleteClass(id: string) {
    if (!confirm("Sınıfı sil? (İçinde öğrenci varsa engellenir)")) return;
    const res = await fetch("/api/admin/classes/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return alert(j?.error || "Silinemedi");
    loadAll();
  }

  // ---- sınıfa atama (tekli) ----
  async function assignOne(studentId: string, classId: string | null) {
    // optimistic UI
    const prev = students;
    setStudents((xs) =>
      xs.map((x) =>
        x.id === studentId
          ? {
              ...x,
              class_id: classId,
              class_name: classId ? classes.find((c) => c.id === classId)?.name || null : null,
            }
          : x
      )
    );
    const res = await fetch("/api/admin/classes/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, classId }),
    });
    if (!res.ok) {
      setStudents(prev);
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Sınıfa atama başarısız");
    } else {
      loadAll(); // doluluk & sayılar tazelensin
    }
  }

  // ---- YENİ: durum değiştir (tekli) ----
  async function changeStatus(studentId: string, next: "active" | "paused" | "left") {
    const prev = students;

    // iyimser UI: 'left' veya (istersen) 'paused' olunca sınıfı boşalt
    setStudents((xs) =>
      xs.map((x) =>
        x.id === studentId
          ? {
              ...x,
              status: next,
              ...(next === "left" ? { class_id: null, class_name: null } : {}),
            }
          : x
      )
    );

    const res = await fetch("/api/admin/students/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        status: next,
        // paused durumunda da sınıftan düşmek istersen true yap:
        // unassign: next === "paused" ? true : undefined,
      }),
    });

    if (!res.ok) {
      setStudents(prev);
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Durum güncellenemedi");
    } else {
      // aktif sekmesindeysek ve öğrenci artık aktif değilse görünümden düşer
      // (filter mekanizması zaten hallediyor)
      loadAll();
    }
  }

  // ---- toplu atama ----
  async function assignBulk() {
    if (!bulkTarget) return alert("Önce hedef sınıfı seçin.");
    if (selectedIds.size === 0) return alert("Öğrenci seçmedin.");
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch("/api/admin/classes/assign", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: id, classId: bulkTarget }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkTarget("");
      await loadAll();
    } catch {
      alert("Toplu atamada hata oldu");
    } finally {
      setBulkBusy(false);
    }
  }

  // ---- liste filtreleri ----
  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();

    return students
      .filter((s) => {
        // durum sekmesi filtresi
        if (statusTab === "active") return s.status === "active";
        if (statusTab === "paused") return s.status === "paused";
        if (statusTab === "left") return s.status === "left";
        if (statusTab === "inactive") return s.status !== "active"; // askıda + ayrıldı
        return true; // "all"
      })
      .filter((s) => {
        // sınıf filtresi
        if (classFilter === "all") return true;
        if (classFilter === "unassigned") return s.class_id == null;
        return s.class_id === classFilter;
      })
      .filter((s) =>
        term
          ? `${s.student_name} ${s.parent_name} ${s.parent_phone_e164}`.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => a.student_name.localeCompare(b.student_name, "tr"));
  }, [students, classFilter, studentSearch, statusTab]);

  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  function toggleSelectAllVisible() {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredStudents.forEach((s) => next.delete(s.id));
    } else {
      filteredStudents.forEach((s) => next.add(s.id));
    }
    setSelectedIds(next);
  }

  // sekme butonu mini bileşeni
  function TabBtn({
    val,
    label,
    tone,
    count,
  }: {
    val: StatusTab;
    label: string;
    tone?: "emerald" | "amber" | "rose" | "slate";
    count?: number;
  }) {
    const active = statusTab === val;
    const toneCls =
      tone === "emerald"
        ? "data-[a=true]:bg-emerald-600 data-[a=true]:text-white"
        : tone === "amber"
        ? "data-[a=true]:bg-amber-600 data-[a=true]:text-white"
        : tone === "rose"
        ? "data-[a=true]:bg-rose-600 data-[a=true]:text-white"
        : "data-[a=true]:bg-slate-900 data-[a=true]:text-white";
    return (
      <button
        onClick={() => setStatusTab(val)}
        data-a={active}
        className={`rounded-full border px-3 py-1 text-sm font-medium transition
          ${toneCls}
          data-[a=true]:border-transparent
          data-[a=false]:bg-white data-[a=false]:text-slate-900 data-[a=false]:border-slate-200
        `}
        title={label}
      >
        {label}
        {typeof count === "number" && (
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">{count}</span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-8">
      {/* Üst başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Öğrenciler & Sınıflar</h1>
          <p className="text-sm text-gray-700">Toplam öğrenci sayıları ve sınıf durumları.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Yenile
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Yeni Sınıf
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>
      )}

      {/* Sayaçlar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Toplam Öğrenci" value={totals.all} />
        <StatCard label="Aktif" value={totals.active} tone="emerald" />
        <StatCard label="Askıda" value={totals.paused} tone="amber" />
        <StatCard label="Ayrıldı" value={totals.left} tone="rose" />
        <StatCard label="Sınıf Sayısı" value={totals.cls} tone="indigo" />
      </div>

      {/* Sınıf Izgarası */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Sınıflar</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => {
            const ratio = Math.min(100, Math.round((c.member_count / c.capacity) * 100));
            const full = c.member_count >= c.capacity;
            return (
              <li key={c.id} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/classes/${c.id}`}
                      className="block truncate text-[16px] font-semibold text-gray-900 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="mt-1 text-sm text-gray-700">
                      Kapasite:{" "}
                      <span className="font-semibold text-gray-900">{c.member_count}</span>/
                      {c.capacity}
                      {c.meeting_days ? ` • ${c.meeting_days}` : ""}
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full ${full ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        full ? "bg-rose-200 text-rose-900" : "bg-emerald-200 text-emerald-900"
                      }`}
                    >
                      {full ? "DOLU" : "Müsait"}
                    </span>
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => deleteClass(c.id)}
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {classes.length === 0 && <li className="text-sm text-gray-600">Henüz sınıf yok.</li>}
        </ul>
      </div>

      {/* --- YENİ: Sekmeler (ikinci sayfa gibi) --- */}
      <div className="flex flex-wrap items-center gap-2">
        <TabBtn val="active" label="Aktif" tone="emerald" count={totals.active} />
        <TabBtn val="paused" label="Askıda" tone="amber" count={totals.paused} />
        <TabBtn val="left" label="Ayrıldı" tone="rose" count={totals.left} />
        <TabBtn val="inactive" label="Aktif Olmayanlar" tone="slate" count={totals.paused + totals.left} />
        <TabBtn val="all" label="Tümü" tone="slate" count={totals.all} />
      </div>

      {/* Öğrenciler (Filtreli & Atama & Durum) */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Öğrenciler — {labelForTab(statusTab)}
          </h2>
          <div className="text-sm text-gray-700">
            Görünen: <b>{filteredStudents.length}</b> / {students.length}
          </div>
        </div>

        {/* Filtre bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value === "all" || e.target.value === "unassigned"
                    ? (e.target.value as any)
                    : e.target.value
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              title="Sınıfa göre filtrele"
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="unassigned">Sınıfa Atanmamış</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.member_count}/{c.capacity})
                </option>
              ))}
            </select>

            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Öğrenci/veli/telefon ara…"
              className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Toplu atama */}
          <div className="flex items-center gap-2">
            <select
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Hedef sınıf seç…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.member_count}/{c.capacity})
                </option>
              ))}
            </select>
            <button
              onClick={assignBulk}
              disabled={!bulkTarget || selectedIds.size === 0 || bulkBusy}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {bulkBusy ? "Atanıyor…" : `Seçilenleri Ata (${selectedIds.size})`}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    title="Hepsini seç / bırak"
                  />
                </th>
                <th className="px-3 py-3">Öğrenci</th>
                <th className="px-3 py-3">Veli / Tel</th>
                <th className="px-3 py-3">Mevcut Sınıf</th>
                <th className="px-3 py-3">Durum</th>
                <th className="px-3 py-3">Sınıfa Ata</th>
              </tr>
            </thead>
            <tbody className="text-[15px] text-gray-900">
              {filteredStudents.map((s, i) => (
                <tr key={s.id} className={i % 2 ? "bg-gray-50/50" : ""}>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        setSelectedIds(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{s.student_name}</div>
                    <div className="text-[12px] text-gray-700">
                      Kayıt: {new Date(s.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{s.parent_name}</div>
                    <div className="text-gray-700">{s.parent_phone_e164}</div>
                  </td>
                  <td className="px-3 py-2">
                    {s.class_id ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                        {s.class_name}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-900">
                        — Atanmamış —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {/* YENİ: durum seçimi */}
                    <select
                      value={s.status}
                      onChange={(e) =>
                        changeStatus(s.id, e.target.value as "active" | "paused" | "left")
                      }
                      className={`rounded-lg border px-2 py-1 text-sm ${
                        s.status === "active"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : s.status === "paused"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-rose-300 bg-rose-50 text-rose-900"
                      }`}
                      title="Durumu değiştir"
                    >
                      <option value="active">Aktif</option>
                      <option value="paused">Askıda</option>
                      <option value="left">Ayrıldı</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.class_id || ""}
                      onChange={(e) => assignOne(s.id, e.target.value ? e.target.value : null)}
                      className="w-56 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value="">— Sınıf seçin —</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.member_count}/{c.capacity})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">
                    Seçili filtre/sekme/aramaya uygun öğrenci bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sınıf Modal */}
      {classModalOpen && (
        <Modal title={editing ? "Sınıfı Düzenle" : "Yeni Sınıf"} onClose={() => setClassModalOpen(false)}>
          <div className="space-y-3">
            <L label="Sınıf Adı *">
              <I value={cName} onChange={setCName} placeholder="Örn. Salı 20:00 - A" />
            </L>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <L label="Kapasite *">
                <I type="number" min={1} max={40} value={cCap} onChange={setCCap} />
              </L>
              <L label="Gün/Saat (ops.)">
                <I value={cDays} onChange={setCDays} placeholder='Örn. "Salı 20:00"' />
              </L>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Btn ghost onClick={() => setClassModalOpen(false)}>İptal</Btn>
            <Btn primary disabled={busy} onClick={saveClass}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --- küçük bileşenler --- */
function StatCard({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: number;
  tone?: "gray" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const map: any = {
    gray: "bg-gray-100 text-gray-900",
    emerald: "bg-emerald-100 text-emerald-900",
    amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-900",
    indigo: "bg-indigo-100 text-indigo-900",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-700">{label}</div>
      <div className={`mt-1 inline-flex items-center rounded-lg px-2 py-1 text-xl font-bold ${map[tone]}`}>
        {value}
      </div>
    </div>
  );
}
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function L({ label, children }: any) {
  return (
    <div>
      <label className="text-sm text-gray-800">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function I({ value, onChange, ...rest }: any) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500"
    />
  );
}
function Btn({ primary, ghost, disabled, children, ...rest }: any) {
  const cls = primary
    ? "bg-emerald-600 text-white hover:bg-emerald-700"
    : ghost
    ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
    : "bg-black text-white";
  return (
    <button disabled={disabled} {...rest} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${cls}`}>
      {children}
    </button>
  );
}

// YENİ: sekme başlığı
function labelForTab(t: "active" | "paused" | "left" | "inactive" | "all") {
  switch (t) {
    case "active":
      return "Aktif";
    case "paused":
      return "Askıda";
    case "left":
      return "Ayrıldı";
    case "inactive":
      return "Aktif Olmayanlar";
    default:
      return "Tümü";
  }
}
