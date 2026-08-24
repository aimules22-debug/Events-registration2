/* ============================================================
 * Registration wizard — 5-step progressive disclosure form
 * Step 1 Personal · Step 2 Membership & NRC (duplicate gate)
 * Step 3 Package & accommodation · Step 4 Payment & proof
 * Step 5 Review & submit → confirmation with registration ID.
 * Drafts auto-save to localStorage; NRCs are SHA-256 hashed
 * before being stored by the data layer.
 * ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOMMODATIONS,
  BANKS,
  NRC_RE,
  PACKAGES,
  TREASURY_PHONES,
  fmtK,
  type AccommodationId,
  type PackageId,
  type Registration,
} from "../lib/data";
import { useStore, type NewRegistration } from "../lib/store";
import { Icon, InvoiceModal, type IconName } from "../components/ui";

const DRAFT_KEY = "zihrm2026.draft.v1";

const STEPS: { n: number; label: string; icon: IconName }[] = [
  { n: 1, label: "Personal", icon: "user" },
  { n: 2, label: "Membership", icon: "shield" },
  { n: 3, label: "Package", icon: "clipboard" },
  { n: 4, label: "Payment", icon: "card" },
  { n: 5, label: "Review", icon: "check" },
];

const DISTRICTS = [
  "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chipata", "Kasama", "Mongu", "Solwezi",
  "Kalumbila", "Mufulira", "Chingola", "Mazabuka", "Monze", "Siavonga", "Sinazongwe", "Other",
];

interface FormState {
  firstName: string; lastName: string; email: string; phone: string;
  gender: "" | "male" | "female";
  employer: string; jobTitle: string; district: string;
  nrc: string; membershipNo: string; memberStatus: "" | Registration["memberStatus"];
  packageId: PackageId; accommodationId: AccommodationId;
  payMethod: string; payRef: string;
  proof: { name: string; size: number; type: string } | null;
  agree: boolean;
}

const blankForm = (preset: PackageId | null): FormState => ({
  firstName: "", lastName: "", email: "", phone: "", gender: "",
  employer: "", jobTitle: "", district: "",
  nrc: "", membershipNo: "", memberStatus: "",
  packageId: preset ?? "p2", accommodationId: "none",
  payMethod: "ZNBC transfer", payRef: "", proof: null, agree: false,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateStep(step: number, f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (f.firstName.trim().length < 2) e.firstName = "First name is required.";
    if (f.lastName.trim().length < 2) e.lastName = "Surname is required.";
    if (!EMAIL_RE.test(f.email)) e.email = "Enter a valid email address.";
    if (!/^0\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Zambian format: 09XXXXXXXX.";
    if (!f.gender) e.gender = "Select one.";
    if (!f.employer.trim()) e.employer = "Employer is required.";
    if (!f.jobTitle.trim()) e.jobTitle = "Job title is required.";
    if (!f.district) e.district = "Select your district.";
  }
  if (step === 2) {
    if (!NRC_RE.test(f.nrc)) e.nrc = "Format: 123456/78/9";
    if (!/^ZIHRM\/\d{4,6}$/i.test(f.membershipNo.trim())) e.membershipNo = "Format: ZIHRM/12345";
    if (!f.memberStatus) e.memberStatus = "Select your status.";
  }
  if (step === 4) {
    if (!f.payMethod) e.payMethod = "Choose a payment channel.";
    if (f.payRef.trim().length < 6) e.payRef = "Enter the slip / transaction reference.";
    if (!f.proof) e.proof = "Upload your proof of payment.";
  }
  if (step === 5 && !f.agree) e.agree = "You must accept before submitting.";
  return e;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-flag"><Icon name="alert" size={12} />{msg}</p>;
}

export default function Register() {
  const { route, navigate, register, findDuplicate, toast, settings } = useStore();
  const [form, setForm] = useState<FormState>(() => blankForm(route.presetPackage ?? null));
  const [step, setStep] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [dup, setDup] = useState<Registration | null>(null);
  const [checking, setChecking] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [draftOffer, setDraftOffer] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Registration | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [shake, setShake] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => validateStep(step, form), [step, form]);
  const pkg = PACKAGES.find((p) => p.id === form.packageId)!;
  const total = pkg.prices[form.accommodationId];

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  /* ————— draft auto-save ————— */
  useEffect(() => {
    if (done || draftOffer) return;
    const t = setTimeout(() => {
      const hasContent = form.firstName || form.email || form.nrc || form.lastName;
      if (!hasContent) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, savedAt: Date.now() }));
        setSavedAt(Date.now());
      } catch { /* ignore quota */ }
    }, 600);
    return () => clearTimeout(t);
  }, [form, done, draftOffer]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { form: FormState; savedAt: number };
        if (parsed?.form?.firstName || parsed?.form?.nrc) setDraftOffer(parsed.form);
      }
    } catch { /* ignore */ }
  }, []);

  /* ————— live duplicate detection (step 2) ————— */
  useEffect(() => {
    if (step !== 2) return;
    const nrcOk = NRC_RE.test(form.nrc);
    const memOk = /^ZIHRM\/\d{4,6}$/i.test(form.membershipNo.trim());
    if (!nrcOk && !memOk) {
      setDup(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(() => {
      const hit = findDuplicate(nrcOk ? form.nrc : "", memOk ? form.membershipNo.trim() : "");
      setDup(hit);
      setChecking(false);
    }, 380);
    return () => clearTimeout(t);
  }, [step, form.nrc, form.membershipNo, findDuplicate]);

  /* ————— navigation ————— */
  const goNext = () => {
    setAttempted(true);
    if (Object.keys(errors).length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (step === 2 && dup) return;
    setAttempted(false);
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0 });
  };

  const goBack = () => {
    setAttempted(false);
    setStep((s) => Math.max(1, s - 1));
  };

  /* ————— proof-of-payment upload ————— */
  const onFile = (file: File | undefined | null) => {
    if (!file) return;
    const okTypes = ["application/pdf", "image/jpeg", "image/png"];
    const okExt = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!okTypes.includes(file.type) && !okExt) {
      toast("error", "Unsupported file type", "Proof of payment must be PDF, JPG or PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "File too large", "Maximum size is 5 MB.");
      return;
    }
    set("proof", { name: file.name, size: file.size, type: file.type || "file" });
    toast("success", "Proof of payment attached", file.name);
  };

  /* ————— submit ————— */
  const submit = async () => {
    setAttempted(true);
    if (!form.agree) return;
    setSubmitting(true);
    const input: NewRegistration = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(), phone: form.phone.trim(),
      gender: form.gender as "male" | "female",
      employer: form.employer.trim(), jobTitle: form.jobTitle.trim(), district: form.district,
      nrc: form.nrc.trim(), membershipNo: form.membershipNo.trim().toUpperCase(),
      memberStatus: form.memberStatus as Registration["memberStatus"],
      packageId: form.packageId, accommodationId: form.accommodationId,
      payMethod: form.payMethod, payRef: form.payRef.trim(), proof: form.proof,
    };
    // simulated network latency — hashes NRC (SHA-256) & re-checks duplicates
    await new Promise((r) => setTimeout(r, 950));
    const res = await register(input);
    setSubmitting(false);
    if (!res.ok) {
      toast("error", "Duplicate registration blocked", res.dup ? `This NRC / membership number already holds ${res.dup.id}.` : "Submission rejected.");
      setStep(2);
      setDup(res.dup ?? null);
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    setDone(res.reg);
    toast("success", "Registration confirmed", `A confirmation email with ID ${res.reg.id} was sent to ${res.reg.email}.`);
  };

  /* ————— success screen ————— */
  if (done) {
    return (
      <div className="bg-chitenge min-h-[80vh]">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <div className="stamp-in mx-auto w-fit rounded-lg border-[3px] border-pine-700 px-6 py-2.5 font-display text-2xl font-extrabold tracking-[0.14em] text-pine-700 uppercase" style={{ borderStyle: "double" }}>
            Registered
          </div>
          <h1 className="fade-up mt-8 font-display text-5xl font-extrabold tracking-tight text-ink" style={{ animationDelay: "0.15s" }}>
            Welcome, {done.firstName}.
          </h1>
          <p className="fade-up mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink/65" style={{ animationDelay: "0.25s" }}>
            Your delegate pass is reserved. A confirmation email with your invoice and payment
            reference has been sent to <strong className="text-ink">{done.email}</strong>.
          </p>

          <div className="card fade-up mx-auto mt-10 max-w-md overflow-hidden text-left" style={{ animationDelay: "0.35s" }}>
            <div className="bg-pine-900 px-6 py-4 text-paper">
              <p className="font-mono text-[10px] tracking-[0.24em] text-copper-300 uppercase">Registration ID</p>
              <p className="num mt-1 text-[30px] leading-none font-semibold">{done.id}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-5 text-[13.5px]">
              <div><p className="label mb-0.5">Package</p><p className="font-semibold">{pkg.code} — {pkg.name}</p></div>
              <div><p className="label mb-0.5">Total due</p><p className="num font-semibold text-pine-800">{fmtK(done.total)}</p></div>
              <div><p className="label mb-0.5">Accommodation</p><p className="font-semibold">{ACCOMMODATIONS.find((a) => a.id === done.accommodationId)!.short}</p></div>
              <div><p className="label mb-0.5">Payment status</p><p className="font-semibold text-copper-700">Pending verification</p></div>
            </div>
            <div className="border-t border-dashed border-ink/15 px-6 py-4 text-[12.5px] text-ink/55">
              Treasury verifies payments within 48 h — quote <span className="num font-semibold text-ink">{done.id}</span> on your deposit slip.
              Questions? {TREASURY_PHONES.join(" / ")}
            </div>
          </div>

          <div className="fade-up mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: "0.45s" }}>
            <button className="btn-pine h-12 px-6" onClick={() => setShowInvoice(true)}>
              <Icon name="printer" size={16} /> View tax invoice
            </button>
            <button className="btn-ghost h-12 px-6" onClick={() => navigate("home")}>
              Back to convention site <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </div>
        {showInvoice && <InvoiceModal reg={done} settings={settings} onClose={() => setShowInvoice(false)} />}
      </div>
    );
  }

  /* ————— wizard ————— */
  return (
    <div className="bg-chitenge min-h-[80vh] pb-20">
      <div className="mx-auto max-w-3xl px-5 pt-10">
        {/* header + progress */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={() => navigate("home")} className="mb-2 inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-ink/50 uppercase transition hover:text-ink">
              <Icon name="arrowLeft" size={13} /> Convention site
            </button>
            <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-tight text-ink">Delegate registration</h1>
          </div>
          <div className={`flex items-center gap-2 font-mono text-[11px] tracking-wide text-ink/50 ${savedAt ? "" : "opacity-0"}`}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-pine-600" />
            Draft saved {savedAt ? new Date(savedAt).toLocaleTimeString("en-GB") : ""}
          </div>
        </div>

        {/* progress */}
        <div className="mt-7">
          <div className="flex items-center justify-between">
            {STEPS.map((s) => {
              const active = step === s.n;
              const passed = step > s.n;
              return (
                <button
                  key={s.n}
                  onClick={() => s.n < step && setStep(s.n)}
                  className={`group flex items-center gap-2 ${s.n < step ? "cursor-pointer" : "cursor-default"}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-[12.5px] font-semibold transition-all duration-300 ${
                      passed
                        ? "border-pine-700 bg-pine-700 text-paper"
                        : active
                          ? "border-copper-500 bg-copper-500 text-white shadow-[0_6px_16px_-6px_rgba(180,94,21,0.7)]"
                          : "border-ink/20 bg-white text-ink/40"
                    }`}
                  >
                    {passed ? <Icon name="check" size={15} /> : s.n}
                  </span>
                  <span className={`hidden font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase sm:block ${active ? "text-ink" : "text-ink/40"}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div className="bar-fill h-full rounded-full bg-gradient-to-r from-pine-700 to-copper-500" style={{ width: `${((step - 1) / 4) * 100}%`, transitionDuration: "0.5s" }} />
          </div>
        </div>

        {/* draft resume banner */}
        {draftOffer && (
          <div className="fade-up mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-copper-500/35 bg-copper-100/60 px-5 py-3.5">
            <p className="flex items-center gap-2.5 text-[13.5px] font-medium text-copper-700">
              <Icon name="clock" size={16} /> We saved a draft from your last visit — resume where you left off?
            </p>
            <div className="flex gap-2">
              <button className="btn h-9 bg-copper-600 px-4 text-[12.5px] text-white hover:bg-copper-700" onClick={() => { setForm(draftOffer); setDraftOffer(null); toast("info", "Draft restored"); }}>Resume</button>
              <button className="btn-ghost h-9 px-4 text-[12.5px]" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraftOffer(null); }}>Discard</button>
            </div>
          </div>
        )}

        {/* step panel */}
        <div key={step} className={`card fade-up mt-6 p-6 sm:p-8 ${shake ? "shake" : ""}`}>
          {step === 1 && (
            <StepShell title="Who is attending?" sub="These details print on your delegate badge — double-check the spelling.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" err={attempted ? errors.firstName : undefined}>
                  <input className={`field ${attempted && errors.firstName ? "field-err" : ""}`} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="e.g. Mulenga" />
                </Field>
                <Field label="Surname" err={attempted ? errors.lastName : undefined}>
                  <input className={`field ${attempted && errors.lastName ? "field-err" : ""}`} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="e.g. Chanda" />
                </Field>
                <Field label="Email" err={attempted ? errors.email : undefined}>
                  <input type="email" className={`field ${attempted && errors.email ? "field-err" : ""}`} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.zm" />
                </Field>
                <Field label="Mobile number" err={attempted ? errors.phone : undefined}>
                  <input className={`field ${attempted && errors.phone ? "field-err" : ""}`} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="097 1234567" />
                </Field>
                <Field label="Employer / organisation" err={attempted ? errors.employer : undefined}>
                  <input className={`field ${attempted && errors.employer ? "field-err" : ""}`} value={form.employer} onChange={(e) => set("employer", e.target.value)} placeholder="e.g. ZESCO Limited" />
                </Field>
                <Field label="Job title" err={attempted ? errors.jobTitle : undefined}>
                  <input className={`field ${attempted && errors.jobTitle ? "field-err" : ""}`} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. HR Officer" />
                </Field>
                <Field label="District" err={attempted ? errors.district : undefined}>
                  <select className={`field ${attempted && errors.district ? "field-err" : ""} ${form.district ? "" : "text-ink/35"}`} value={form.district} onChange={(e) => set("district", e.target.value)}>
                    <option value="">Select district…</option>
                    {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Gender" err={attempted ? errors.gender : undefined}>
                  <div className="flex h-11 items-center gap-2">
                    {(["female", "male"] as const).map((g) => (
                      <button key={g} type="button" onClick={() => set("gender", g)}
                        className={`h-full flex-1 cursor-pointer rounded-md border text-sm font-medium capitalize transition-all ${form.gender === g ? "border-pine-800 bg-pine-900 text-paper" : "border-ink/15 bg-white text-ink/55 hover:border-ink/35"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Membership & NRC verification" sub="Your NRC is hashed (SHA-256) before storage and used to block duplicate registrations.">
              {checking && (
                <p className="mb-5 flex items-center gap-2 font-mono text-[12px] tracking-wide text-ink/50">
                  <Icon name="refresh" size={14} className="spin" /> Checking registry for duplicates…
                </p>
              )}
              {dup && (
                <div className="shake mb-6 rounded-lg border border-flag/35 bg-flag/8 p-5">
                  <p className="flex items-center gap-2 font-display text-[17px] font-bold text-flag">
                    <Icon name="alert" size={18} /> Duplicate registration detected
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">
                    This NRC / membership number is already registered under{" "}
                    <span className="num rounded bg-white px-1.5 py-0.5 font-semibold text-ink">{dup.id}</span>
                    {" "}({dup.firstName} {dup.lastName}). Re-submissions are blocked to keep attendance records clean.
                    Lost your ID? Call the treasury desk on <strong>{TREASURY_PHONES.join(" or ")}</strong>.
                  </p>
                </div>
              )}
              {!dup && form.nrc && NRC_RE.test(form.nrc) && !checking && (
                <p className="fade-up mb-6 flex items-center gap-2.5 rounded-lg border border-pine-700/25 bg-pine-100/60 px-4 py-3 text-[13px] font-medium text-pine-800">
                  <Icon name="check" size={15} /> No existing registration found for this NRC — you may proceed.
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="NRC number" err={attempted ? errors.nrc : undefined}>
                  <input className={`field num ${attempted && errors.nrc ? "field-err" : ""}`} value={form.nrc} onChange={(e) => set("nrc", e.target.value)} placeholder="123456/78/9" inputMode="numeric" />
                </Field>
                <Field label="ZIHRM membership number" err={attempted ? errors.membershipNo : undefined}>
                  <input className={`field num ${attempted && errors.membershipNo ? "field-err" : ""}`} value={form.membershipNo} onChange={(e) => set("membershipNo", e.target.value)} placeholder="ZIHRM/12345" />
                </Field>
                <Field label="Membership status" err={attempted ? errors.memberStatus : undefined}>
                  <div className="flex h-11 items-center gap-2">
                    {(["full", "associate", "non-member"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => set("memberStatus", m)}
                        className={`h-full flex-1 cursor-pointer rounded-md border px-1 text-[12.5px] font-medium capitalize transition-all ${form.memberStatus === m ? "border-pine-800 bg-pine-900 text-paper" : "border-ink/15 bg-white text-ink/55 hover:border-ink/35"}`}>
                        {m.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Choose your package" sub="Prices update instantly — accommodation adds two nights B&B at the partner hotels.">
              <div className="space-y-3">
                {PACKAGES.map((p) => {
                  const sel = form.packageId === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => set("packageId", p.id)}
                      className={`w-full cursor-pointer rounded-lg border-2 p-5 text-left transition-all ${sel ? "border-copper-500 bg-copper-100/40 shadow-[0_10px_28px_-16px_rgba(180,94,21,0.5)]" : "border-ink/12 bg-white hover:border-ink/30"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${sel ? "border-copper-500 bg-copper-500 text-white" : "border-ink/25"}`}>
                            {sel && <Icon name="check" size={13} />}
                          </span>
                          <div>
                            <p className="font-mono text-[10.5px] tracking-[0.2em] text-copper-600 uppercase">{p.code} · {p.tagline}</p>
                            <p className="font-display text-xl font-bold text-ink">{p.name}</p>
                          </div>
                        </div>
                        <p key={form.accommodationId} className="fade-up num text-[24px] font-semibold text-pine-900">{fmtK(p.prices[form.accommodationId])}</p>
                      </div>
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/8 pt-3 text-[12.5px] text-ink/60">
                        {p.perks.slice(0, 3).map((perk) => <span key={perk} className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-pine-600" />{perk}</span>)}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="label mt-7">Accommodation</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {ACCOMMODATIONS.map((a) => {
                  const sel = form.accommodationId === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => set("accommodationId", a.id)}
                      className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${sel ? "border-pine-800 bg-pine-900 text-paper" : "border-ink/12 bg-white hover:border-ink/30"}`}>
                      <p className="flex items-center gap-2 text-[13.5px] font-bold"><Icon name="bed" size={15} className={sel ? "text-copper-300" : "text-copper-600"} />{a.short}</p>
                      <p className={`mt-1 text-[11.5px] leading-snug ${sel ? "text-paper/65" : "text-ink/55"}`}>{a.nights} · {a.note}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-7 flex items-center justify-between rounded-lg bg-pine-900 px-6 py-4 text-paper">
                <p className="font-mono text-[11px] tracking-[0.18em] text-paper/60 uppercase">Total due · VAT incl.</p>
                <p key={total} className="fade-up num text-[30px] leading-none font-semibold text-copper-300">{fmtK(total)}</p>
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Payment & proof of upload" sub={`Deposit ${fmtK(total)} to any of the accounts below, then attach the slip.`}>
              <div className="grid gap-3 sm:grid-cols-3">
                {BANKS.map((b) => (
                  <div key={b.id} className="rounded-lg border border-ink/12 bg-mist/50 p-4">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-copper-600 uppercase">{b.short}</p>
                    <p className="num mt-1.5 text-[14px] font-semibold text-ink">{b.accountNo}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-ink/55">{b.accountName}<br />{b.branch}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[12px] text-ink/55">
                <Icon name="phone" size={13} className="text-copper-600" /> Treasury desk: <span className="num font-semibold text-ink">{TREASURY_PHONES.join(" / ")}</span>
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Payment channel" err={attempted ? errors.payMethod : undefined}>
                  <select className="field" value={form.payMethod} onChange={(e) => set("payMethod", e.target.value)}>
                    {["ZNBC transfer", "INDO transfer", "Stanbic transfer", "Mobile money (MTN / Airtel)", "Cash at secretariat"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Slip / transaction reference" err={attempted ? errors.payRef : undefined}>
                  <input className={`field num ${attempted && errors.payRef ? "field-err" : ""}`} value={form.payRef} onChange={(e) => set("payRef", e.target.value)} placeholder="e.g. ZNBC-88413377" />
                </Field>
              </div>
              <div className="mt-6">
                <p className="label">Proof of payment (PDF, JPG or PNG · max 5 MB) <span className="text-flag">*</span></p>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                {form.proof ? (
                  <div className="fade-up flex items-center gap-4 rounded-lg border border-pine-700/25 bg-pine-100/50 px-5 py-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-pine-900 text-copper-300"><Icon name="file" size={19} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{form.proof.name}</p>
                      <p className="num text-[11.5px] text-ink/50">{(form.proof.size / 1024).toFixed(0)} KB · {form.proof.type || "file"}</p>
                    </div>
                    <Icon name="check" size={18} className="text-pine-700" />
                    <button className="btn-ghost h-9 w-9 px-0" onClick={() => set("proof", null)} aria-label="Remove file"><Icon name="x" size={15} /></button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-9 transition-all hover:border-copper-500 hover:bg-copper-100/30 ${attempted && errors.proof ? "border-flag/50 bg-flag/5" : "border-ink/20 bg-mist/40"}`}
                  >
                    <Icon name="upload" size={22} className="text-copper-600" />
                    <p className="text-[13.5px] font-semibold text-ink">Click to upload or drag &amp; drop</p>
                    <p className="font-mono text-[11px] tracking-wide text-ink/45 uppercase">PDF · JPG · PNG — up to 5 MB</p>
                  </button>
                )}
                {attempted && <Err msg={errors.proof} />}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Review & submit" sub="One last look — your invoice is generated the moment you submit.">
              <dl className="divide-y divide-ink/8 text-[13.5px]">
                {[
                  ["Delegate", `${form.firstName} ${form.lastName} · ${form.gender}`],
                  ["Contact", `${form.email} · ${form.phone}`],
                  ["Employer", `${form.jobTitle} — ${form.employer}, ${form.district}`],
                  ["NRC / Membership", `${form.nrc} · ${form.membershipNo.toUpperCase()} (${form.memberStatus})`],
                  ["Package", `${pkg.code} — ${pkg.name}`],
                  ["Accommodation", ACCOMMODATIONS.find((a) => a.id === form.accommodationId)!.name],
                  ["Payment", `${form.payMethod} · ref ${form.payRef}`],
                  ["Proof", form.proof ? `${form.proof.name} (${(form.proof.size / 1024).toFixed(0)} KB)` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
                    <dt className="font-mono text-[10.5px] font-medium tracking-[0.16em] text-ink/45 uppercase sm:pt-0.5">{k}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
                <div className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
                  <dt className="font-mono text-[10.5px] font-medium tracking-[0.16em] text-ink/45 uppercase sm:pt-0.5">Total due</dt>
                  <dd className="num text-[22px] font-semibold text-pine-900">{fmtK(total)}</dd>
                </div>
              </dl>
              <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${form.agree ? "border-pine-700/30 bg-pine-100/50" : "border-ink/12"} ${attempted && errors.agree ? "border-flag/40" : ""}`}>
                <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 h-4 w-4 accent-pine-800" />
                <span className="text-[13px] leading-relaxed text-ink/70">
                  I confirm the details above are correct and consent to ZIHRM processing them for convention
                  administration. I understand my NRC is stored as a SHA-256 hash and duplicate registrations are blocked.
                </span>
              </label>
              {attempted && <Err msg={errors.agree} />}
            </StepShell>
          )}

          {/* nav */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-6">
            <button className="btn-ghost" onClick={goBack} disabled={step === 1}>
              <Icon name="arrowLeft" size={16} /> Back
            </button>
            {step < 5 ? (
              <button className="btn-copper min-w-[150px]" onClick={goNext} disabled={step === 2 && (!!dup || checking)}>
                Continue <Icon name="arrowRight" size={16} />
              </button>
            ) : (
              <button className="btn-copper min-w-[190px]" onClick={submit} disabled={submitting}>
                {submitting ? (<><Icon name="refresh" size={16} className="spin" /> Registering…</>) : (<>Submit registration <Icon name="send" size={16} /></>)}
              </button>
            )}
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[11px] tracking-wide text-ink/40 uppercase">
          Step {step} of 5 · progress auto-saves on this device
        </p>
      </div>
    </div>
  );
}

/* small helpers */

function StepShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-[13.5px] text-ink/55">{sub}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      <Err msg={err} />
    </div>
  );
}


