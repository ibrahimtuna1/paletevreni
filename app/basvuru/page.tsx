// app/basvuru/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Step = "form" | "confirm" | "done";

type Form = {
  studentName: string;
  parentName: string;
  parentPhone: string; // UI'da maskeli görünür
  age: string;
  smsConsent: boolean;

  // ✅ yeni alanlar
  heardFrom: string;        // instagram | google | arkadas | afis | reklam | okul | whatsapp | youtube | other
  heardFromOther: string;   // other ise açıklama
};

/* -------------------- Telefon yardımcıları -------------------- */
function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

/** Baştaki tüm 0'ları at; varsa en baştaki '90' ülke kodunu da düşür. */
function stripTrPrefixes(d: string) {
  d = d.replace(/^0+/, "");
  if (d.startsWith("90")) d = d.slice(2);
  return d;
}

/** TR mobil numarayı E.164'e çevirir: +905XXXXXXXXX, yoksa null */
function normalizeTRMobile(input: string): string | null {
  let d = onlyDigits(input);
  d = stripTrPrefixes(d);
  if (d.length !== 10 || !d.startsWith("5")) return null; // sadece 5xx mobil
  return `+90${d}`;
}

/** E.164 → yerel 0'lı formata çevir: +905XXXXXXXXX → 0XXX XXX XX XX */
function e164ToLocal(e164: string): string | null {
  if (!/^\+905\d{9}$/.test(e164)) return null;
  const d = e164.slice(3); // '5XXXXXXXXX' (10 hane)
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/** UI görüntüsü için maske: +90 5XX XXX XX XX (kullanıcı yazarken) */
function formatTRMobileForDisplay(input: string): string {
  let d = onlyDigits(input);
  d = stripTrPrefixes(d);
  d = d.slice(0, 10); // yazarken max 10 hane tut

  const p1 = d.slice(0, 1); // 5
  const p2 = d.slice(1, 3); // xx
  const p3 = d.slice(3, 6); // xxx
  const p4 = d.slice(6, 8); // xx
  const p5 = d.slice(8, 10); // xx

  let out = "+90";
  if (p1) out += " " + p1;
  if (p2) out += p2;
  if (p3) out += " " + p3;
  if (p4) out += " " + p4;
  if (p5) out += " " + p5;
  return out;
}
/* -------------------------------------------------------------- */

/* -------------------- Kaynak seçenekleri -------------------- */
const HEARD_OPTIONS: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "other", label: "Arkadaş Tavsiyesi" },
];

const heardLabel = (v: string) => HEARD_OPTIONS.find((o) => o.value === v)?.label ?? "Seçilmedi";

export default function Page() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    studentName: "",
    parentName: "",
    parentPhone: "",
    age: "",
    smsConsent: false,
    heardFrom: "",
    heardFromOther: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [showConsentText, setShowConsentText] = useState(false);

  // ✅ kaynak seçim modal state
  const [heardOpen, setHeardOpen] = useState(false);
  const [heardTemp, setHeardTemp] = useState<string>("");        // modal içi geçici seçim
  const [heardOtherTemp, setHeardOtherTemp] = useState<string>("");

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#cb6ce6]";

  const validate = (f: Form) => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (f.studentName.trim().length < 2) e.studentName = "Lütfen öğrenci adını girin.";
    if (f.parentName.trim().length < 2) e.parentName = "Lütfen veli adını girin.";
    const ageNum = Number(f.age);
    if (!ageNum || ageNum < 5 || ageNum > 99) e.age = "Yaş 5–99 aralığında olmalı.";

    // Telefon validasyonu (sadece mobil, E.164)
    const e164 = normalizeTRMobile(f.parentPhone);
    if (!e164) e.parentPhone = "Lütfen geçerli bir mobil numara girin (örn: +90 5XX XXX XX XX).";

    // ✅ Kaynak validasyonu
    if (!f.heardFrom) e.heardFrom = "Lütfen bir kaynak seçin.";
    if (f.heardFrom === "other" && f.heardFromOther.trim().length < 2)
      e.heardFromOther = "Lütfen kısaca belirtin.";

    if (!f.smsConsent) e.smsConsent = "SMS bilgilendirme izni zorunludur.";
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

  // ---- Supabase INSERT (route yok; DB'ye 0'lı format gider) ----
  const finalize = async () => {
    setSubmitting(true);
    setGlobalErr(null);
    try {
      // 1) E.164'e normalize
      const phoneE164 = normalizeTRMobile(form.parentPhone);
      if (!phoneE164) {
        setErrors((prev) => ({ ...prev, parentPhone: "Lütfen geçerli bir mobil numara girin." }));
        setSubmitting(false);
        return;
      }
      // 2) E.164'ten yerel 0'lıya (10 hane kayıpsız garanti)
      const phoneLocal = e164ToLocal(phoneE164)!;

      const { error } = await supabase.from("basvurular").insert([
        {
          student_name: form.studentName.trim(),
          parent_name: form.parentName.trim(),
          parent_phone: phoneLocal, // 0543 296 69 30 gibi
          age: Number(form.age),
          sms_consent: form.smsConsent,
          sms_consent_at: new Date().toISOString(),

          // ✅ yeni alanları kaydet
          heard_from: form.heardFrom || null,
          heard_from_other: form.heardFrom === "other" ? form.heardFromOther.trim() || null : null,
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

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#12061a] via-[#0b0f1a] to-[#041418] text-white">
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 blur-3xl">
        <div className="mx-auto h-72 w-[72rem] rotate-[30deg] rounded-full bg-gradient-to-tr from-[#cb6ce6]/25 via-transparent to-[#008e9a]/25 opacity-70" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
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
                  Kısa formu doldurun; uygun saat için sizi arayalım. Bilgilendirme mesajı gönderebilmemiz için
                  SMS izni gereklidir.
                </p>
              </header>

              {globalErr && (
                <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {globalErr}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="text-sm text-white/80">Öğrenci Adı</label>
                  <input
                    type="text"
                    className={inputBase}
                    value={form.studentName}
                    onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                    required
                  />
                  {errors.studentName && <p className="mt-1 text-xs text-rose-300">{errors.studentName}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/80">Veli Adı</label>
                    <input
                      type="text"
                      className={inputBase}
                      value={form.parentName}
                      onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                      required
                    />
                    {errors.parentName && <p className="mt-1 text-xs text-rose-300">{errors.parentName}</p>}
                  </div>
                  <div>
                    <label className="text-sm text-white/80">Veli Telefonu (Mobil)</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="+90 5XX XXX XX XX"
                      className={inputBase}
                      value={form.parentPhone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, parentPhone: formatTRMobileForDisplay(e.target.value) }))
                      }
                      onBlur={(e) => {
                        // blur'da +90'lı doğru maskeyi göster
                        const n = normalizeTRMobile(e.target.value);
                        if (n) setForm((f) => ({ ...f, parentPhone: formatTRMobileForDisplay(n) }));
                      }}
                      required
                      aria-invalid={!!errors.parentPhone}
                      aria-describedby="phoneHelp"
                    />
                    <p id="phoneHelp" className="mt-1 text-xs text-white/50">
                      Sadece mobil numara kabul edilir. Örn: <span className="font-mono">+90 532 000 00 00</span>
                    </p>
                    {errors.parentPhone && <p className="mt-1 text-xs text-rose-300">{errors.parentPhone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/80">Yaş</label>
                    <input
                      type="number"
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

                  {/* ✅ Bizi nereden duydunuz? */}
                  <div>
                    <label className="text-sm text-white/80">Bizi nereden duydunuz?</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        className={`${inputBase} flex-1 cursor-default`}
                        value={
                          form.heardFrom
                            ? form.heardFrom === "other" && form.heardFromOther.trim()
                              ? `${heardLabel(form.heardFrom)}: ${form.heardFromOther.trim()}`
                              : heardLabel(form.heardFrom)
                            : ""
                        }
                        placeholder="Kaynak seçin…"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHeardTemp(form.heardFrom || "");
                          setHeardOtherTemp(form.heardFromOther || "");
                          setHeardOpen(true);
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm hover:bg-white/10"
                      >
                        Seç
                      </button>
                    </div>
                    {errors.heardFrom && <p className="mt-1 text-xs text-rose-300">{errors.heardFrom}</p>}
                    {errors.heardFromOther && <p className="mt-1 text-xs text-rose-300">{errors.heardFromOther}</p>}
                  </div>
                </div>

                {/* ✅ SMS onayı (zorunlu) */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.smsConsent}
                      onChange={(e) => setForm((f) => ({ ...f, smsConsent: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
                      required
                    />
                    <span className="text-sm text-white/80">
                      Tanıtım dersi, ders hatırlatması ve kayıt süreçleri hakkında tarafıma{" "}
                      <b>SMS/arama ile bilgilendirme</b> yapılmasına izin veriyorum.{" "}
                      <button
                        type="button"
                        onClick={() => setShowConsentText((x) => !x)}
                        className="underline decoration-dotted underline-offset-4"
                      >
                        Ayrıntıyı göster
                      </button>
                    </span>
                  </label>
                  {errors.smsConsent && <p className="mt-2 text-xs text-rose-300">{errors.smsConsent}</p>}
                  {showConsentText && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                      Kişisel verilerim 6698 sayılı KVKK kapsamında yalnızca iletişim ve randevu amaçlarıyla işlenecek,
                      üçüncü kişilerle paylaşılmayacaktır. İznimi dilediğim zaman geri çekebilirim.
                    </div>
                  )}
                </div>

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
            <ConfirmCard form={form} onEdit={() => setStep("form")} onConfirm={finalize} busy={submitting} />
          )}

          {step === "done" && <SuccessCard form={form} />}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-white/50">
          © {new Date().getFullYear()} Palet Evreni – Renklerle öğrenmenin en eğlenceli yolu.
        </p>
      </div>

      {/* ✅ Kaynak seçimi MODAL — siyah arka plan, beyaz yazı, giriş animasyonu */}
      {heardOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 opacity-100 transition-opacity"
            onClick={() => setHeardOpen(false)}
          />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div
              className="w-full max-w-md transform rounded-2xl border border-white/10 bg-black p-5 text-white shadow-2xl transition duration-200 ease-out
                         animate-[fadeIn_0.15s_ease-out] [@keyframes_fadeIn]{0%{opacity:0;transform:scale(.96)}100%{opacity:1;transform:scale(1)}}"
            >
              <h3 className="text-lg font-semibold">Bizi nereden duydunuz?</h3>
              <p className="mt-1 text-sm text-white/70">Bir seçenek işaretleyin. “Diğer” ise kısaca yazın.</p>

              <div className="mt-4 space-y-2">
                {HEARD_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm
                                ${heardTemp === o.value ? "border-white/30 bg-white/10" : "border-white/10 bg-white/[.04]"}`}
                  >
                    <input
                      type="radio"
                      name="heard"
                      checked={heardTemp === o.value}
                      onChange={() => setHeardTemp(o.value)}
                      className="h-4 w-4"
                    />
                    <span>{o.label}</span>
                  </label>
                ))}

                {heardTemp === "other" && (
                  <input
                    autoFocus
                    placeholder="Örn: Mahalle etkinliği, komşu, vs."
                    value={heardOtherTemp}
                    onChange={(e) => setHeardOtherTemp(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-[#cb6ce6]"
                  />
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHeardOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      heardFrom: heardTemp,
                      heardFromOther: heardTemp === "other" ? heardOtherTemp : "",
                    }));
                    setHeardOpen(false);
                  }}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  const sourceText =
    form.heardFrom
      ? form.heardFrom === "other" && form.heardFromOther.trim()
        ? `${heardLabel(form.heardFrom)}: ${form.heardFromOther.trim()}`
        : heardLabel(form.heardFrom)
      : "—";

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold">Bilgileri Onayla</h2>
      <p className="mt-2 text-sm text-white/70">Başvurunuzu göndermeden önce lütfen kontrol edin.</p>

      <div className="mx-auto mt-5 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm">
        <Row label="Öğrenci Adı" value={form.studentName} />
        <Row label="Veli Adı" value={form.parentName} />
        <Row label="Veli Telefonu" value={form.parentPhone} />
        <Row label="Yaş" value={form.age} />
        <Row label="Bizi Nereden Duydunuz" value={sourceText} />
        <Row label="SMS İzni" value={form.smsConsent ? "Verildi" : "—"} />
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
  const sourceText =
    form.heardFrom
      ? form.heardFrom === "other" && form.heardFromOther.trim()
        ? `${heardLabel(form.heardFrom)}: ${form.heardFromOther.trim()}`
        : heardLabel(form.heardFrom)
      : "—";

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-500/20 p-2">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500/30 text-2xl">✅</div>
      </div>
      <h2 className="text-xl font-semibold">Başvurunuz alındı!</h2>
      <p className="mt-2 text-sm text-white/70">
        Teşekkürler <span className="font-medium text-white">{form.parentName || "Veli"}</span>. En kısa sürede sizi
        arayıp teyit edeceğiz.
      </p>

      <div className="mx-auto mt-5 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm">
        <Row label="Öğrenci" value={form.studentName} />
        <Row label="Veli" value={form.parentName} />
        <Row label="Veli Tel" value={form.parentPhone} />
        <Row label="Yaş" value={form.age} />
        <Row label="Bizi Nereden Duydu" value={sourceText} />
        <Row label="SMS İzni" value={form.smsConsent ? "Verildi" : "—"} />
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
