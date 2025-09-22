// app/basvuru/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Step = "form" | "confirm" | "done";

type Form = {
  studentName: string;
  parentName: string;
  parentPhone: string;
  age: string;
  dateId: string; // YYYY-MM-DD
};

type Slot = {
  id: string; // YYYY-MM-DD
  date: Date;
  labelTop: string; // Pts, Sal, ...
  labelBottom: string; // 23 Eyl
};

export default function Page() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    studentName: "",
    parentName: "",
    parentPhone: "",
    age: "",
    dateId: "",
  });
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  // Sadece 5 adet hafta içi günü üret (bugünden başlayarak)
  const slots = useMemo<Slot[]>(() => {
    const out: Slot[] = [];
    const today = new Date();
    for (let i = 0; out.length < 5 && i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay(); // 0 Pzr, 1 Pts, ... 6 Cmt
      if (dow >= 1 && dow <= 5) {
        const id = d.toISOString().slice(0, 10);
        out.push({
          id,
          date: d,
          labelTop: shortDayTR(d),
          labelBottom: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
        });
      }
    }
    return out;
  }, []);

  // DEMO: bir tanesini "DOLU" göster (UI disable). Gerçekte API'den gelir.
  const fullSet = useMemo(() => {
    const indicesToFull = new Set([1]); // 2. slot dolu
    return new Set(slots.filter((_, i) => indicesToFull.has(i)).map((s) => s.id));
  }, [slots]);

  const validate = (f: Form) => {
    const e: Partial<Form> = {};
    if (f.studentName.trim().length < 2) e.studentName = "Lütfen öğrenci adını girin.";
    if (f.parentName.trim().length < 2) e.parentName = "Lütfen veli adını girin.";
    const ageNum = Number(f.age);
    if (!ageNum || ageNum < 5 || ageNum > 99) e.age = "Yaş 5–99 aralığında olmalı.";
    const digits = f.parentPhone.replace(/\D/g, "");
    if (digits.length < 10) e.parentPhone = "Geçerli bir veli telefonu girin (en az 10 hane).";
    if (!f.dateId) e.dateId = "Lütfen uygun günü seçin.";
    if (f.dateId && fullSet.has(f.dateId)) e.dateId = "Seçtiğiniz gün dolu.";
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setGlobalErr(null);
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep("confirm");
  };

  // ---- Supabase INSERT ----
  const finalize = async () => {
    setSubmitting(true);
    setGlobalErr(null);

    try {
      const { error } = await supabase.from("basvurular").insert([
        {
          student_name: form.studentName.trim(),
          parent_name: form.parentName.trim(),
          parent_phone: form.parentPhone.trim(),
          age: Number(form.age),
          date_id: form.dateId, // 'YYYY-MM-DD'
        },
      ]);

      if (error) {
        console.error("Başvuru kaydedilemedi:", error);
        setGlobalErr("Bir hata oluştu, lütfen tekrar deneyin.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setStep("done");
    } catch (err) {
      console.error(err);
      setGlobalErr("Beklenmeyen bir hata oluştu.");
      setSubmitting(false);
    }
  };

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#cb6ce6]";

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#12061a] via-[#0b0f1a] to-[#041418] text-white">
      {/* üst parıltı */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 blur-3xl">
        <div className="mx-auto h-72 w-[72rem] rotate-[30deg] rounded-full bg-gradient-to-tr from-[#cb6ce6]/25 via-transparent to-[#008e9a]/25 opacity-70" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* header / geri */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            ← Geri
          </button>
          <span className="text-sm text-white/60">Palet Evreni</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur sm:p-8">
          {step === "form" && (
            <>
              <header className="mb-6 sm:mb-8">
                <h1 className="text-2xl font-semibold sm:text-3xl">Ücretsiz Tanışma Dersi Başvurusu</h1>
                <p className="mt-2 text-sm text-white/70">
                  Kısa formu doldurun; hafta içi <b>20:00</b> için size uygun bir günü ayıralım. Müsaitlik teyidi için
                  sizi arayacağız.
                </p>
              </header>

              {globalErr && (
                <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {globalErr}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                {/* Öğrenci adı */}
                <div>
                  <label className="text-sm text-white/80">Öğrenci Adı</label>
                  <input
                    type="text"
                    name="studentName"
                    className={inputBase}
                    value={form.studentName}
                    onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                    required
                  />
                  {errors.studentName && <p className="mt-1 text-xs text-rose-300">{errors.studentName}</p>}
                </div>

                {/* Veli adı + Veli telefon */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/80">Veli Adı</label>
                    <input
                      type="text"
                      name="parentName"
                      className={inputBase}
                      value={form.parentName}
                      onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                      required
                    />
                    {errors.parentName && <p className="mt-1 text-xs text-rose-300">{errors.parentName}</p>}
                  </div>

                  <div>
                    <label className="text-sm text-white/80">Veli Telefonu</label>
                    <input
                      type="tel"
                      name="parentPhone"
                      inputMode="tel"
                      className={inputBase}
                      value={form.parentPhone}
                      onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
                      required
                    />
                    {errors.parentPhone && <p className="mt-1 text-xs text-rose-300">{errors.parentPhone}</p>}
                  </div>
                </div>

                {/* Yaş */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/80">Yaş</label>
                    <input
                      type="number"
                      name="age"
                      inputMode="numeric"
                      min={5}
                      max={99}
                      className={inputBase}
                      value={form.age}
                      onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                      required
                    />
                    {errors.age && <p className="mt-1 text-xs text-rose-300">{errors.age}</p>}
                  </div>
                </div>

                {/* Gün seçimi (hafta içi, 20:00) */}
                <div>
                  <label className="mb-2 block text-sm text-white/80">Gün Seçimi (Hafta içi, 20:00)</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {slots.map((s) => {
                      const isFull = fullSet.has(s.id);
                      const isSelected = form.dateId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={isSelected}
                          disabled={isFull}
                          onClick={() => !isFull && setForm((f) => ({ ...f, dateId: s.id }))}
                          className={[
                            "group rounded-xl border px-3 py-2 text-center",
                            "transition focus:outline-none focus:ring-2",
                            isFull
                              ? "cursor-not-allowed border-white/10 bg-white/5 opacity-50"
                              : isSelected
                              ? "border-[#cb6ce6] bg-[#cb6ce6]/10 ring-[#cb6ce6]"
                              : "border-white/10 bg-white/5 hover:bg-white/10",
                          ].join(" ")}
                          title={isFull ? "Kontenjan dolu" : "Seç"}
                        >
                          <div className="text-xs font-medium">{s.labelTop}</div>
                          <div className="text-sm">{s.labelBottom}</div>
                          <div className="mt-1 text-[11px] text-white/70">20:00</div>
                          {isFull && (
                            <span className="mt-1 inline-block rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-200">
                              DOLU
                            </span>
                          )}
                          {isSelected && !isFull && (
                            <span className="mt-1 inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                              Seçildi
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.dateId && <p className="mt-2 text-xs text-rose-300">{errors.dateId}</p>}
                </div>

                {/* Bilgilendirme kutusu */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Bilgileriniz yalnızca randevu planlaması için kullanılacaktır.</li>
                    <li>İlk görüşme ücretsizdir; detayları telefonda netleştireceğiz.</li>
                    <li>Seçtiğiniz gün doluysa farklı bir gün öneririz.</li>
                  </ul>
                </div>

                {/* Gönder */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#cb6ce6] to-[#008e9a] px-5 py-3 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Başvuruyu Gönder
                  </button>
                </div>

                <p className="text-center text-xs text-white/60">
                  Sorunuz mu var?{" "}
                  <a href="tel:+90" className="underline decoration-dotted underline-offset-4">
                    Hemen arayın
                  </a>
                  .
                </p>
              </form>
            </>
          )}

          {step === "confirm" && (
            <ConfirmCard
              form={form}
              onEdit={() => setStep("form")}
              onConfirm={finalize}
              busy={submitting}
            />
          )}

          {step === "done" && <SuccessCard form={form} />}
        </div>

        {/* alt not */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-white/50">
          © {new Date().getFullYear()} Palet Evreni – Renklerle öğrenmenin en eğlenceli yolu.
        </p>
      </div>
    </main>
  );
}

function ConfirmCard({
  form,
  onEdit,
  onConfirm,
  busy,
}: {
  form: Form;
  onEdit: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const d = form.dateId ? new Date(form.dateId + "T20:00:00") : null;
  const human =
    d &&
    d.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold">Bilgileri Onayla</h2>
      <p className="mt-2 text-sm text-white/70">Başvurunuzu göndermeden önce lütfen kontrol edin.</p>

      <div className="mx-auto mt-5 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm">
        <Row label="Öğrenci Adı" value={form.studentName} />
        <Row label="Veli Adı" value={form.parentName} />
        <Row label="Veli Telefonu" value={form.parentPhone} />
        <Row label="Yaş" value={form.age} />
        <Row label="Gün / Saat" value={`${human || "—"} • 20:00`} />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onEdit}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 sm:w-auto"
        >
          Düzenle
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-[#cb6ce6] to-[#008e9a] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Gönderiliyor…" : "Onayla & Başvur"}
        </button>
      </div>
    </div>
  );
}

function SuccessCard({ form }: { form: Form }) {
  const d = form.dateId ? new Date(form.dateId + "T20:00:00") : null;
  const human =
    d &&
    d.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-500/20 p-2">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500/30 text-2xl">✅</div>
      </div>
      <h2 className="text-xl font-semibold">Başvurunuz alındı!</h2>
      <p className="mt-2 text-sm text-white/70">
        Teşekkürler <span className="font-medium text-white">{form.parentName || "Veli"}</span>. Seçilen slot:{" "}
        <b>{human || "—"} 20:00</b>. En kısa sürede sizi arayıp teyit edeceğiz.
      </p>

      <div className="mx-auto mt-5 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm">
        <Row label="Öğrenci" value={form.studentName} />
        <Row label="Veli" value={form.parentName} />
        <Row label="Veli Tel" value={form.parentPhone} />
        <Row label="Yaş" value={form.age} />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a href="/" className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm hover:bg-white/20 sm:w-auto">
          Ana sayfaya dön
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex justify-between">
      <span className="text-white/70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function shortDayTR(d: Date) {
  const long = d.toLocaleDateString("tr-TR", { weekday: "long" }).toLowerCase();
  if (long.startsWith("pazartesi")) return "Pts";
  if (long.startsWith("salı")) return "Sal";
  if (long.startsWith("çarşamba")) return "Çar";
  if (long.startsWith("perşembe")) return "Per";
  if (long.startsWith("cuma")) return "Cum";
  if (long.startsWith("cumartesi")) return "Cmt";
  return "Paz";
}
