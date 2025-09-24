"use client";

import { useEffect, useMemo, useState } from "react";

/* ---- Tipler ---- */
type Row = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone_e164: string;
  age: number | null;
  scheduled_at: string; // ISO
  status: "scheduled" | "attended" | "no_show" | "cancelled";
  admin_note: string | null;
  created_at: string; // başvuru onay kaydı zamanı
};

type Package = {
  id: string;
  title: string;
  total_price: number;
  total_sessions: number;
};

/* ---- Yardımcılar ---- */
const pad = (n: number) => String(n).padStart(2, "0");
const trDay = (d: Date) =>
  d.toLocaleDateString("tr-TR", { weekday: "long" }).replace(/^\w/, (c) => c.toUpperCase());
const trHuman = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 pazar, 1 pazartesi...
  const diff = (day === 0 ? -6 : 1) - day; // pazartesiye çek
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---- Component ---- */
export default function TrialsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf());
  const [activeDay, setActiveDay] = useState<string>(() => ymd(new Date())); // YYYY-MM-DD
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null); // note save spinner

  // Satın alma modal state
  const [sellOpen, setSellOpen] = useState(false);
  const [sellTrialId, setSellTrialId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgId, setPkgId] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>(""); // opsiyonel
  const [paidAt, setPaidAt] = useState<string>(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yy}-${mm}-${dd}T${hh}:${mi}`;
  });
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [selling, setSelling] = useState(false);

  // *** Manuel başvuru modal state (yeni) ***
  const [manualOpen, setManualOpen] = useState(false);
  const [mStudent, setMStudent] = useState("");
  const [mParent, setMParent] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mAge, setMAge] = useState<string>("");
  const [mWhen, setMWhen] = useState<string>(() => `${ymd(new Date())}T20:00`);
  const [manualBusy, setManualBusy] = useState(false);

  // --- ADDED: Günlük toplu mesaj composer state'leri
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const MSG_MAX = 500;

  // 7 günlük menü
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return {
        id: ymd(d),
        labelTop: trDay(d),
        labelBottom: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      };
    });
  }, [weekStart]);

  // ilk renderda aktif günü haftaya uyumla
  useEffect(() => {
    const inWeek = days.find((x) => x.id === activeDay);
    if (!inWeek) setActiveDay(days[0].id);
  }, [days]); // eslint-disable-line

  async function load() {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/admin/trials/day?d=${encodeURIComponent(activeDay)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(json?.error || "Liste alınamadı");
      setRows([]);
      return;
    }
    setRows((json?.items ?? []) as Row[]);
  }

  useEffect(() => {
    // aktif gün değişince manuel formun tarihini de günün 20:00’ına çek
    setMWhen(`${activeDay}T20:00`);
    load();
    // msgText resetlemek istersen:
    // setMsgText(""); setMsgOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay]);

  async function saveNote(id: string, note: string) {
    setSavingId(id);
    const res = await fetch(`/api/admin/trials/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note }),
    });
    setSavingId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Not kaydedilemedi");
      return false;
    }
    return true;
  }

  async function openSellModal(row: Row) {
    setSellTrialId(row.id);
    setSellOpen(true);
    // paketleri bir kez çek
    if (packages.length === 0) {
      const res = await fetch("/api/admin/packages", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setPackages((j?.items ?? []) as Package[]);
      else alert(j?.error || "Paket listesi getirilemedi");
    }
  }

  async function confirmSell() {
    if (!sellTrialId || !pkgId) return;
    setSelling(true);
    const body = {
      trialId: sellTrialId,
      packageId: pkgId,
      paidAmount: paidAmount ? Number(paidAmount) : 0,
      paidAt: paidAt ? new Date(paidAt).toISOString() : null,
      method,
    };
    const res = await fetch("/api/admin/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setSelling(false);
    if (!res.ok) {
      alert(j?.error || "Satın alma başarısız");
      return;
    }
    setSellOpen(false);
    setSellTrialId(null);
    setPkgId("");
    setPaidAmount("");
    await load(); // listeyi tazele
  }

  // --- ADDED: Seçili güne ait listedeki tüm trial'lara mesaj gönder
  async function sendDayMessage() {
    if (!msgText.trim()) {
      alert("Mesaj boş olamaz.");
      return;
    }
    if (rows.length === 0) {
      alert("Bu gün için kayıtlı öğrenci yok.");
      return;
    }
    setMsgBusy(true);
    const res = await fetch("/api/admin/trials/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: activeDay, // YYYY-MM-DD
        trial_ids: rows.map((r) => r.id),
        message: msgText.trim(),
      }),
    });
    const j = await res.json().catch(() => ({}));
    setMsgBusy(false);
    if (!res.ok) {
      alert(j?.error || "Mesaj gönderilemedi");
      return;
    }
    setMsgText("");
    setMsgOpen(false);
    alert("Mesaj gönderildi.");
  }

  // *** Manuel başvuru kaydet (yeni) ***
  async function confirmManual() {
    if (!mStudent.trim() || !mParent.trim() || !mPhone.trim() || !mWhen) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }
    setManualBusy(true);
    const res = await fetch("/api/admin/trials/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: mStudent.trim(),
        parent_name: mParent.trim(),
        parent_phone: mPhone.trim(),
        age: mAge ? Number(mAge) : null,
        scheduled_at: new Date(mWhen).toISOString(),
      }),
    });
    const j = await res.json().catch(() => ({}));
    setManualBusy(false);
    if (!res.ok) {
      alert(j?.error || "Kayıt eklenemedi");
      return;
    }
    setManualOpen(false);
    // formu sıfırla
    setMStudent("");
    setMParent("");
    setMPhone("");
    setMAge("");
    setMWhen(`${activeDay}T20:00`);
    await load();
  }

  return (
    <div className="space-y-6">
      {/* Üst başlık + hafta gezinme */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tanıtım Dersi Öğrencileri</h1>
          <p className="text-sm text-gray-600">
            {trDay(new Date(activeDay))},{" "}
            {new Date(activeDay).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            ← Önceki Hafta
          </button>
          <button
            onClick={() => {
              const m = mondayOf(new Date());
              setWeekStart(m);
              setActiveDay(ymd(new Date()));
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            Bugün
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            Sonraki Hafta →
          </button>

          {/* Manuel başvuru ekle (yeni) */}
          <button
            onClick={() => setManualOpen(true)}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Manuel Başvuru Ekle
          </button>
        </div>
      </div>

      {/* Gün menüsü */}
      <div className="overflow-x-auto">
        <div className="flex w-full gap-2">
          {days.map((d) => {
            const active = d.id === activeDay;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDay(d.id)}
                className={[
                  "min-w-[120px] flex-1 rounded-xl border px-3 py-2 text-left shadow-sm transition",
                  active ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="text-xs uppercase tracking-wide">{d.labelTop}</div>
                <div className="text-base font-semibold">{d.labelBottom}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- ADDED: Günlük toplu mesaj composer --- */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-indigo-900">Günlük Mesaj</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Alıcı: {rows.length} öğrenci
                </span>
              </div>
              <p className="mt-1 text-sm text-indigo-800/90">
                {trDay(new Date(activeDay))} günü için listelenen tanıtım dersi öğrencilerine toplu mesaj gönder.
              </p>
            </div>
            <button
              onClick={() => setMsgOpen((v) => !v)}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              {msgOpen ? "Kapat" : "Mesaj Yaz"}
            </button>
          </div>

          {msgOpen && (
            <div className="mt-3">
              <textarea
                value={msgText}
                onChange={(e) => {
                  if (e.target.value.length <= MSG_MAX) setMsgText(e.target.value);
                }}
                rows={4}
                placeholder="Örn: Merhaba, tanıtım dersimiz bugün 20:00’da. Sorunuz olursa bu mesajı yanıtlayabilirsiniz."
                className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-indigo-400 focus:border-indigo-500 focus:ring-indigo-200"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-indigo-800/80">{msgText.length}/{MSG_MAX}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={msgBusy}
                    onClick={() =>
                      setMsgText(
                        `Merhaba, tanıtım dersimiz bugün ${new Date(activeDay).toLocaleDateString("tr-TR", { weekday: "long" })} saat 20:00’da yapılacaktır. Sorunuz olursa bu mesaja yanıt verebilirsiniz. Görüşmek üzere!`
                      )
                    }
                    className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Hızlı Şablon
                  </button>
                  <button
                    type="button"
                    disabled={msgBusy || !msgText.trim()}
                    onClick={sendDayMessage}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {msgBusy ? "Gönderiliyor…" : "Gönder"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hata uyarısı */}
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">{err}</div>}

      {/* Liste / tablo */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Saat</th>
              <th className="px-4 py-3">Öğrenci</th>
              <th className="px-4 py-3">Veli / Telefon</th>
              <th className="px-4 py-3">Yaş</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Admin Notu</th>
              <th className="px-4 py-3">Kaydı Oluşturan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  Yükleniyor…
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                    {new Date(r.scheduled_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    <div className="mt-1 text-xs text-gray-500">Ders: {trHuman(r.scheduled_at)}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.student_name}</div>
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    <div>{r.parent_name}</div>
                    <div className="text-gray-600">{r.parent_phone_e164}</div>
                  </td>

                  <td className="px-4 py-3 text-gray-800">{r.age ?? "—"}</td>

                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>

                  <td className="px-4 py-3">
                    <NoteEditor
                      defaultValue={r.admin_note ?? ""}
                      saving={savingId === r.id}
                      onSave={(v) => saveNote(r.id, v)}
                    />
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-600">
                    Kayıt:{" "}
                    {new Date(r.created_at).toLocaleString("tr-TR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => openSellModal(r)}
                      className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Paket Satın Al
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  Bu günde tanıtım dersi bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paket Satın Alma MODAL */}
      {sellOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Paket Satın Al</h3>
            <p className="mt-1 text-sm text-gray-600">Paket seçin; isterseniz ilk ödemeyi de girin.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-700">Paket</label>
                <select
                  value={pkgId}
                  onChange={(e) => setPkgId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="">Seçin…</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {money(p.total_price)} / {p.total_sessions} ders
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-700">İlk Ödeme (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="opsiyonel"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Ödeme Tarihi/Saati</label>
                  <input
                    type="datetime-local"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700">Ödeme Yöntemi</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="cash">Nakit</option>
                  <option value="card">Kart</option>
                  <option value="transfer">Havale/EFT</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSellOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                disabled={!pkgId || selling}
                onClick={confirmSell}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {selling ? "İşleniyor…" : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Başvuru MODAL (yeni) */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Manuel Başvuru Ekle</h3>
            <p className="mt-1 text-sm text-gray-600">
              {trDay(new Date(activeDay))} günü için tanıtım dersi kaydı oluşturun.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-700">Öğrenci Adı *</label>
                <input
                  value={mStudent}
                  onChange={(e) => setMStudent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-700">Veli Adı *</label>
                  <input
                    value={mParent}
                    onChange={(e) => setMParent(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Veli Telefonu *</label>
                  <input
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    placeholder="05xx…"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-700">Yaş</label>
                  <input
                    type="number"
                    min={5}
                    max={99}
                    value={mAge}
                    onChange={(e) => setMAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tarih / Saat *</label>
                  <input
                    type="datetime-local"
                    value={mWhen}
                    onChange={(e) => setMWhen(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                  <div className="mt-1 text-xs text-gray-500">Örnek: 20:00 • {trDay(new Date(activeDay))}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setManualOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                İptal
              </button>
              <button
                disabled={manualBusy}
                onClick={confirmManual}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {manualBusy ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Küçük bileşenler ---- */

function StatusPill({ status }: { status: Row["status"] }) {
  const map: Record<Row["status"], string> = {
    scheduled: "bg-sky-100 text-sky-700",
    attended: "bg-emerald-100 text-emerald-700",
    no_show: "bg-amber-100 text-amber-700",
    cancelled: "bg-rose-100 text-rose-700",
  };
  const labels: Record<Row["status"], string> = {
    scheduled: "Planlandı",
    attended: "Katıldı",
    no_show: "Gelmedi",
    cancelled: "İptal",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function NoteEditor({
  defaultValue,
  onSave,
  saving,
}: {
  defaultValue: string;
  onSave: (v: string) => Promise<boolean>;
  saving: boolean;
}) {
  const [val, setVal] = useState(defaultValue);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setVal(defaultValue);
    setDirty(false);
  }, [defaultValue]);

  return (
    <div className="flex w-72 max-w-full flex-col gap-2">
      <textarea
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setDirty(true);
        }}
        rows={3}
        placeholder="Not ekleyin..."
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black/20"
      />
      <div className="flex justify-end gap-2">
        <button
          disabled={!dirty || saving}
          onClick={async () => {
            const ok = await onSave(val);
            if (ok) setDirty(false);
          }}
          className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
