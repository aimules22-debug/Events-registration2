/* ============================================================
 * ZIHRM 2026 — shared UI primitives
 * Inline-SVG icon set, scroll reveals, modal, toasts, charts,
 * and the printable invoice document.
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACCOMMODATIONS,
  BANKS,
  PACKAGES,
  TREASURY_PHONES,
  fmtDate,
  fmtK,
  fmtTime,
  type Registration,
  type EventSettings,
} from "../lib/data";

/* ————— icons (stroke-based inline SVG) ————— */

const P: Record<string, ReactNode> = {
  arrowRight: (<><path d="M4.5 12h15" /><path d="M13.5 6l6 6-6 6" /></>),
  arrowLeft: (<><path d="M19.5 12h-15" /><path d="M10.5 6l-6 6 6 6" /></>),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  x: (<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5L16.6 16.6" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" /></>),
  pin: (<><path d="M12 21.5S5 15.6 5 10a7 7 0 1 1 14 0c0 5.6-7 11.5-7 11.5z" /><circle cx="12" cy="10" r="2.5" /></>),
  users: (<><circle cx="9" cy="7.5" r="3.5" /><path d="M2.5 20.5v-1a5.5 5.5 0 0 1 11 0v1" /><path d="M16 4.6a3.5 3.5 0 0 1 0 5.8" /><path d="M18 14.4a5.5 5.5 0 0 1 3.5 5.1v1" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.4-3.4 4.3-5 7.5-5s6.1 1.6 7.5 5" /></>),
  shield: (<><path d="M12 2.8l7.5 3v5.4c0 4.9-3.6 8-7.5 9.9-3.9-1.9-7.5-5-7.5-9.9V5.8z" /><path d="M8.8 11.8l2.3 2.3 4.2-4.2" /></>),
  clipboard: (<><rect x="5" y="4.5" width="14" height="16.5" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="M9 12.5l2 2 4-4" /></>),
  download: (<><path d="M12 3.5v11" /><path d="M6.5 9.5l5.5 5.5 5.5-5.5" /><path d="M4 20h16" /></>),
  upload: (<><path d="M12 15V4" /><path d="M6.5 9L12 3.5 17.5 9" /><path d="M4 20h16" /></>),
  file: (<><path d="M6 2.5h8.5L19 7v14.5H6z" /><path d="M14 2.5V7.5h5" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7.5L12 13.5l8.5-6" /></>),
  phone: (<path d="M4.5 3.5h4l1.8 4.6-2.3 1.6a12.5 12.5 0 0 0 5.3 5.3l1.6-2.3 4.6 1.8v4a1.5 1.5 0 0 1-1.7 1.5A16.5 16.5 0 0 1 3 5.2 1.5 1.5 0 0 1 4.5 3.5z" />),
  bank: (<><path d="M3 21h18" /><path d="M5 17.5v-6M9.7 17.5v-6M14.3 17.5v-6M19 17.5v-6" /><path d="M3 10.5L12 3.5l9 7z" /></>),
  chart: (<><path d="M3.5 20.5h17" /><path d="M6 20.5v-6" /><path d="M11 20.5V5" /><path d="M16 20.5v-9.5" /><path d="M21 20.5V9" /></>),
  logout: (<><path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M15.5 16.5L20 12l-4.5-4.5" /><path d="M20 12H9.5" /></>),
  plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  trash: (<><path d="M4 7h16" /><path d="M9.5 7V4h5v3" /><path d="M6.5 7l1 13.5h9l1-13.5" /><path d="M10 11v6M14 11v6" /></>),
  filter: <path d="M3.5 5h17l-6.5 7.6V19l-4 2v-8.4z" />,
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2.5" /></>),
  building: (<><rect x="4.5" y="3.5" width="15" height="17" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /><path d="M10.5 20.5v-2.5h3v2.5" /></>),
  bed: (<><path d="M3 18.5V7" /><path d="M3 14.5h18v4" /><path d="M21 14.5V11a2 2 0 0 0-2-2h-8v5.5" /><circle cx="7" cy="10.5" r="1.8" /></>),
  shirt: (<path d="M8.5 3.5L12 5.5l3.5-2 4.5 3.5-2.5 3-1.5-1v12h-8V9L6.5 10 4 7z" />),
  watch: (<><rect x="8" y="7" width="8" height="10" rx="2.5" /><path d="M12 10v2.5l1.7 1.2" /><path d="M9 7l.6-4h4.8L15 7M9 17l.6 4h4.8l.6-4" /></>),
  battery: (<><rect x="2.5" y="8" width="17" height="8" rx="2" /><path d="M21.5 10.5v3" /><path d="M6 10.5v3M9.5 10.5v3" /></>),
  printer: (<><path d="M7 8V3h10v5" /><rect x="3.5" y="8" width="17" height="8" rx="1.5" /><path d="M7 13.5h10v7.5H7z" /></>),
  alert: (<><path d="M12 3.5L22 21H2z" /><path d="M12 10v4.5" /><path d="M12 17.8v.2" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8v.2" /></>),
  refresh: (<><path d="M20.5 4.5v5h-5" /><path d="M3.5 12a8.5 8.5 0 0 1 14.8-5.7l2.2 2.2" /><path d="M3.5 19.5v-5h5" /><path d="M20.5 12a8.5 8.5 0 0 1-14.8 5.7L3.5 15.5" /></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.6" /></>),
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  sliders: (<><path d="M4 7h9M17 7h3" /><circle cx="15" cy="7" r="2" /><path d="M4 17h3M11 17h9" /><circle cx="9" cy="17" r="2" /></>),
  send: (<><path d="M21.5 2.5L11 13" /><path d="M21.5 2.5l-6.8 19-3.7-8.3-8.5-3.7z" /></>),
  copy: (<><rect x="9" y="9" width="11.5" height="11.5" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
  card: (<><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /></>),
  spark: <path d="M12 2.5l2.2 6.6 6.8.3-5.3 4.4 1.8 6.7L12 16.7l-5.5 3.8 1.8-6.7-5.3-4.4 6.8-.3z" />,
  qr: (<><rect x="3.5" y="3.5" width="7" height="7" /><rect x="13.5" y="3.5" width="7" height="7" /><rect x="3.5" y="13.5" width="7" height="7" /><path d="M13.5 13.5h3v3h-3zM17.5 17.5h3v3h-3z" /></>),
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 18, className = "", strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}

export function Logo({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={dark ? "#D4761C" : "#0B3227"} />
        <path d="M8 9h16v4L14.5 21H24v4H8v-4l9.5-8H8z" fill={dark ? "#0B3227" : "#D4761C"} />
        <circle cx="25.5" cy="6.5" r="2" fill={dark ? "#0B3227" : "#E8B04B"} />
      </svg>
      <span className="leading-none">
        <span className={`block font-display text-[17px] font-bold tracking-tight ${dark ? "text-paper" : "text-ink"}`}>ZIHRM</span>
        <span className="mt-0.5 block font-mono text-[9px] font-medium tracking-[0.24em] text-copper-600 uppercase">Convention 2026</span>
      </span>
    </span>
  );
}

export function FlagStripe({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-1.5 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <span className="w-[45%] bg-[#198a00]" />
      <span className="w-[12%] bg-[#de2010]" />
      <span className="w-[21%] bg-[#ef7d00]" />
      <span className="w-[22%] bg-ink" />
    </span>
  );
}

/* ————— scroll reveal ————— */

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`reveal ${vis ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}

/* ————— animated counter ————— */

export function Counter({ to, duration = 1200, format }: { to: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return <span ref={ref}>{format ? format(val) : val.toLocaleString()}</span>;
}

/* ————— modal ————— */

export function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-pine-950/60 p-4 backdrop-blur-[3px] sm:p-8" onMouseDown={onClose}>
      <div
        className={`fade-up card relative my-auto w-full ${wide ? "max-w-3xl" : "max-w-xl"}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

/* ————— status chip ————— */

export function PayChip({ status }: { status: Registration["paymentStatus"] }) {
  const map = {
    verified: "border-pine-700/30 bg-pine-100 text-pine-800",
    pending: "border-copper-500/35 bg-copper-100 text-copper-700",
    rejected: "border-flag/30 bg-flag/10 text-flag",
  } as const;
  return <span className={`chip ${map[status]}`}>{status}</span>;
}

export function PkgBadge({ pkgId }: { pkgId: Registration["packageId"] }) {
  const pkg = PACKAGES.find((p) => p.id === pkgId)!;
  const tone = pkgId === "p1" ? "bg-pine-900 text-paper" : pkgId === "p2" ? "bg-pine-700/12 text-pine-800 border border-pine-700/25" : "border border-ink/15 text-ink/65";
  return <span className={`chip ${tone}`}>{pkg.code}</span>;
}

/* ————— charts (hand-built, no library) ————— */

export function BarRows({ items, unit }: { items: { label: string; value: number; color?: string; hint?: string }[]; unit?: (n: number) => string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-ink/75">{i.label}</span>
            <span className="num text-[12.5px] font-semibold text-ink">
              {unit ? unit(i.value) : i.value}
              {i.hint && <span className="ml-1.5 font-normal text-ink/40">{i.hint}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
            <div className="bar-fill h-full rounded-full" style={{ width: armed ? `${(i.value / max) * 100}%` : "0%", background: i.color ?? "#114534" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, centerLabel, centerSub }: { segments: { label: string; value: number; color: string }[]; centerLabel: string; centerSub: string }) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="150" height="150" viewBox="0 0 140 140" className="shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(19,28,23,0.08)" strokeWidth="17" />
        {segments.map((s) => {
          const frac = s.value / total;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="17"
              strokeDasharray={`${frac * C} ${C}`}
              strokeDashoffset={-acc * C}
              strokeLinecap="butt"
            />
          );
          acc += frac;
          return el;
        })}
        <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
          <text x="70" y="67" textAnchor="middle" className="num" fontSize="24" fontWeight="600" fill="#131C17">
            {centerLabel}
          </text>
          <text x="70" y="84" textAnchor="middle" fontSize="8.5" letterSpacing="1.5" fill="rgba(19,28,23,0.45)">
            {centerSub.toUpperCase()}
          </text>
        </g>
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 text-ink/70">{s.label}</span>
            <span className="num font-semibold">{s.value}</span>
            <span className="num w-10 text-right text-ink/40">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ————— toasts ————— */

export function ToastHost({ toasts, dismiss }: { toasts: { id: number; kind: string; title: string; msg?: string }[]; dismiss: (id: number) => void }) {
  const tones: Record<string, string> = {
    success: "border-pine-700/30 bg-pine-900 text-paper",
    error: "border-flag/40 bg-[#3d1510] text-[#f5ddd8]",
    warning: "border-copper-500/40 bg-[#3a2410] text-copper-100",
    info: "border-ink/20 bg-ink text-paper",
  };
  const icons: Record<string, IconName> = { success: "check", error: "alert", warning: "alert", info: "info" };
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(94vw,360px)] flex-col gap-2.5">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-in pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-xl ${tones[t.kind]}`}>
          <span className="mt-0.5 shrink-0"><Icon name={icons[t.kind]} size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] leading-snug font-semibold">{t.title}</p>
            {t.msg && <p className="mt-0.5 text-[12.5px] leading-snug opacity-75">{t.msg}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="shrink-0 cursor-pointer opacity-60 transition hover:opacity-100" aria-label="Dismiss">
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ————— printable invoice ————— */

export function InvoiceModal({ reg, settings, onClose }: { reg: Registration; settings: EventSettings; onClose: () => void }) {
  const pkg = PACKAGES.find((p) => p.id === reg.packageId)!;
  const acc = ACCOMMODATIONS.find((a) => a.id === reg.accommodationId)!;
  const base = pkg.prices.none;
  const lodging = reg.total - base;
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4 print:hidden">
        <h3 className="font-display text-lg font-bold">Tax Invoice</h3>
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-9 px-3.5 text-[13px]" onClick={() => window.print()}>
            <Icon name="printer" size={15} /> Print / Save PDF
          </button>
          <button className="btn-ghost h-9 w-9 px-0" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
      </div>

      <div id="invoice-print" className="max-h-[72vh] overflow-y-auto px-8 py-7">
        {/* letterhead */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-pine-900 pb-5">
          <div>
            <Logo size={40} />
            <p className="mt-3 max-w-[300px] text-[12px] leading-relaxed text-ink/60">
              Zambia Institute of Human Resource Management · Plot 2259, Kabotobo Road, P.O. Box 31918, Lusaka
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold tracking-tight text-pine-900">TAX INVOICE</p>
            <p className="num mt-1 text-[13px] text-ink/70">{reg.invoiceNo}</p>
            <p className="num text-[12px] text-ink/50">Issued {fmtDate(reg.createdAt)}</p>
          </div>
        </div>

        {/* bill to / event */}
        <div className="mt-5 grid grid-cols-2 gap-6 text-[13px]">
          <div>
            <p className="label">Billed to</p>
            <p className="font-semibold">{reg.firstName} {reg.lastName}</p>
            <p className="text-ink/65">{reg.jobTitle} — {reg.employer}</p>
            <p className="text-ink/65">{reg.email} · {reg.phone}</p>
            <p className="num mt-1 text-ink/65">NRC {reg.nrc} · {reg.membershipNo}</p>
          </div>
          <div>
            <p className="label">Event</p>
            <p className="font-semibold">{settings.name}</p>
            <p className="text-ink/65">{settings.dates}</p>
            <p className="text-ink/65">{settings.venue}, {settings.city}</p>
            <p className="num mt-1 text-copper-700">Registration ID: {reg.id}</p>
          </div>
        </div>

        {/* line items */}
        <table className="mt-6 w-full text-[13.5px]">
          <thead>
            <tr className="border-y border-ink/15 text-left font-mono text-[10.5px] tracking-[0.14em] text-ink/50 uppercase">
              <th className="py-2.5 font-medium">Description</th>
              <th className="py-2.5 text-right font-medium">Amount (ZMW)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink/8">
              <td className="py-3">
                <span className="font-semibold">{pkg.code} — {pkg.name} delegate package</span>
                <span className="mt-0.5 block text-[12px] text-ink/55">{pkg.perks.join(" · ")}</span>
              </td>
              <td className="num py-3 text-right font-semibold">{fmtK(base)}</td>
            </tr>
            {lodging > 0 && (
              <tr className="border-b border-ink/8">
                <td className="py-3">
                  <span className="font-semibold">Accommodation — {acc.name}</span>
                  <span className="mt-0.5 block text-[12px] text-ink/55">{acc.nights} · conference rates incl. VAT</span>
                </td>
                <td className="num py-3 text-right font-semibold">{fmtK(lodging)}</td>
              </tr>
            )}
            <tr>
              <td className="py-3.5 text-right font-display text-[15px] font-bold text-pine-900">TOTAL DUE</td>
              <td className="num py-3.5 text-right font-display text-xl font-extrabold text-pine-900">{fmtK(reg.total)}</td>
            </tr>
          </tbody>
        </table>

        {/* payment */}
        <div className="mt-4 rounded-md border border-copper-500/30 bg-copper-100/50 p-4 text-[12.5px]">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.16em] text-copper-700 uppercase">Banking details — quote {reg.id} as reference</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {BANKS.map((b) => (
              <div key={b.id}>
                <p className="font-semibold">{b.short} — {b.name}</p>
                <p className="text-ink/70">{b.accountName}</p>
                <p className="num text-ink/70">A/C {b.accountNo}</p>
                <p className="text-ink/55">{b.branch}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-ink/60">Treasury desk: {TREASURY_PHONES.join(" / ")} · Payments verified within 48 hours.</p>
        </div>

        <p className="mt-5 text-center text-[11px] text-ink/45">
          This is a system-generated invoice · ZIHRM 2026 · TPIN 1002334567 · Amounts inclusive of VAT
        </p>
      </div>
    </Modal>
  );
}

/* ————— misc ————— */

export function SectionKicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`mb-3 flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase ${light ? "text-copper-300" : "text-copper-600"}`}>
      <span className="inline-block h-[2px] w-7 bg-current" />
      {children}
    </p>
  );
}

export function fmtClock(t: number) {
  return `${fmtDate(t)} · ${fmtTime(t)}`;
}
