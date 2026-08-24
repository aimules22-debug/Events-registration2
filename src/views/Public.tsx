/* ============================================================
 * Public convention site — ticker, hero pass, agenda,
 * fee-package matrix, venues, banking details.
 * ============================================================ */

import { useEffect, useState } from "react";
import {
  ACCOMMODATIONS,
  AGENDA,
  BANKS,
  PACKAGES,
  TREASURY_PHONES,
  currentDay,
  fmtK,
  type AccommodationId,
} from "../lib/data";
import { useStore } from "../lib/store";
import { Counter, Icon, Reveal, SectionKicker } from "../components/ui";

const TICKER_ITEMS = [
  "25–27 March 2026",
  "Radisson Blu Resort · Mosi-oa-Tunya",
  "Livingstone, Zambia",
  "Theme: The People Agenda",
  "3 days · 40+ sessions",
  "Gala dinner & Excellence Awards",
  "Register before seats close",
];

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = target - now;
  return {
    live: diff <= 0,
    d: Math.max(0, Math.floor(diff / 86_400_000)),
    h: Math.max(0, Math.floor(diff / 3_600_000) % 24),
    m: Math.max(0, Math.floor(diff / 60_000) % 60),
    s: Math.max(0, Math.floor(diff / 1000) % 60),
  };
}

/* deterministic barcode bars */
const BARS = Array.from({ length: 42 }, (_, i) => ((i * 7919 + 13) % 9) / 9);

function Barcode() {
  let x = 0;
  return (
    <svg viewBox="0 0 200 34" className="h-8 w-full text-paper/90" preserveAspectRatio="none" aria-hidden="true">
      {BARS.map((r, i) => {
        const w = 1 + Math.round(r * 4);
        const el = <rect key={i} x={x} y={0} width={w} height={34} fill="currentColor" opacity={r > 0.75 ? 0.55 : 0.95} />;
        x += w + 2;
        return el;
      })}
    </svg>
  );
}

export default function Public() {
  const { registrations, settings, navigate, toast } = useStore();
  const [acc, setAcc] = useState<AccommodationId>("none");
  const [agendaDay, setAgendaDay] = useState(0);
  const cd = useCountdown(settings.days[0].iso + 8 * 3_600_000);
  const day = currentDay(settings);
  const seatsTaken = registrations.length;
  const pct = Math.min(100, Math.round((seatsTaken / settings.capacity) * 100));

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("info", "Copied to clipboard", label);
    } catch {
      toast("warning", "Copy failed", text);
    }
  };

  return (
    <div>
      {/* ————— ticker ————— */}
      <div className="marquee overflow-hidden border-b border-pine-900/15 bg-pine-900 py-2 text-paper" aria-hidden="true">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-8">
              {TICKER_ITEMS.map((t, i) => (
                <span key={i} className="flex items-center gap-8 font-mono text-[11px] font-medium tracking-[0.18em] uppercase">
                  <span>{t}</span>
                  <svg width="7" height="7" viewBox="0 0 8 8" className="text-copper-400"><path d="M4 0l4 4-4 4L0 4z" fill="currentColor" /></svg>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ————— hero ————— */}
      <section className="bg-chitenge relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-copper-500/12 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
          <div>
            <Reveal>
              <p className="chip border-copper-500/40 bg-copper-100/70 text-copper-700">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-copper-500" />
                {cd.live ? `Now in session · Day ${day} of 3` : "Registration open"}
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-6 font-display font-extrabold tracking-[-0.02em] text-ink" style={{ fontSize: "clamp(2.9rem, 7.2vw, 5.4rem)", lineHeight: 0.98 }}>
                <span className="mask-line" style={{ "--line-delay": "80ms" } as React.CSSProperties}><span>The People</span></span>
                <span className="mask-line" style={{ "--line-delay": "200ms" } as React.CSSProperties}><span>Agenda<span className="text-copper-500">,</span></span></span>
                <span className="mask-line" style={{ "--line-delay": "320ms" } as React.CSSProperties}>
                  <span>
                    <span className="text-pine-800">Livingstone</span> <span className="text-copper-500">’26</span>
                  </span>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-ink/70">
                The <strong className="font-semibold text-ink">ZIHRM 47th Annual Convention &amp; HR Expo</strong> brings Zambia&apos;s
                people-profession together under one roof — {settings.theme.toLowerCase()}.
                Register once, pay to any of three banks, and walk straight through our express check-in desk.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] tracking-wide text-ink/65">
                <span className="flex items-center gap-2"><Icon name="calendar" size={15} className="text-copper-600" />{settings.dates}</span>
                <span className="flex items-center gap-2"><Icon name="pin" size={15} className="text-copper-600" />{settings.venue}</span>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button className="btn-copper h-12 px-7 text-[15px]" onClick={() => navigate("register")}>
                  Register now <Icon name="arrowRight" size={17} />
                </button>
                <button className="btn-ghost h-12 px-6 text-[15px]" onClick={() => navigate("login")}>
                  <Icon name="shield" size={16} /> Staff portal
                </button>
                {!cd.live ? (
                  <div className="num flex items-center gap-1.5 text-[13px] text-ink/55">
                    <Icon name="clock" size={15} />
                    <span>T-minus {cd.d}d {String(cd.h).padStart(2, "0")}h {String(cd.m).padStart(2, "0")}m {String(cd.s).padStart(2, "0")}s</span>
                  </div>
                ) : (
                  <div className="num flex items-center gap-2 rounded-md border border-pine-700/25 bg-pine-100/70 px-3 py-2 text-[12.5px] font-semibold text-pine-800">
                    <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-pine-600" />
                    LIVE — sessions underway
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          {/* convention pass */}
          <Reveal delay={180} className="relative mx-auto w-full max-w-[360px]">
            <div className="pass-tilt relative rounded-xl bg-pine-900 text-paper shadow-[0_30px_60px_-24px_rgba(6,35,26,0.55)]">
              <div className="absolute top-3 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-paper/90 shadow-inner" />
              <div className="bg-chitenge-light px-6 pt-10 pb-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-[0.3em] text-copper-300 uppercase">Delegate pass</p>
                  <Icon name="qr" size={22} className="text-paper/50" />
                </div>
                <p className="mt-4 font-display text-[26px] leading-tight font-bold">
                  YOUR NAME<br />HERE_
                </p>
                <p className="mt-2 font-mono text-[10.5px] tracking-widest text-paper/55 uppercase">ZIHRM-2026-•••• · Full delegate</p>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-paper/15 pt-4 text-center">
                  {[
                    ["Days", "3"],
                    ["Sessions", "40+"],
                    ["CPD pts", "14"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="num text-xl font-semibold text-copper-300">{v}</p>
                      <p className="mt-0.5 font-mono text-[9px] tracking-[0.2em] text-paper/50 uppercase">{k}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-dashed border-paper/25 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="font-mono text-[9.5px] tracking-[0.22em] text-paper/50 uppercase">Registered</p>
                      <p className="num text-[12px] font-semibold text-paper">
                        <Counter to={seatsTaken} /> / {settings.capacity.toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper/15">
                      <div className="bar-fill h-full rounded-full bg-copper-500" style={{ width: `${Math.max(4, pct * 14)}%` }} />
                    </div>
                  </div>
                  <p className="rotate-90 font-mono text-[8px] tracking-[0.3em] text-paper/35 uppercase">ZIHRM·26</p>
                </div>
                <div className="mt-3"><Barcode /></div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 rotate-[6deg] rounded-md border-2 border-copper-500 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.18em] text-copper-600 uppercase" style={{ borderStyle: "double" }}>
              Early bird closed
            </div>
          </Reveal>
        </div>

        {/* glance strip */}
        <div className="border-y border-ink/10 bg-mist/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-ink/10 px-5 sm:grid-cols-5">
            {[
              ["1,200", "delegates expected"],
              ["40+", "sessions & workshops"],
              ["25", "expo exhibitors"],
              ["3", "days on the Zambezi"],
              ["14", "CPD points on offer"],
            ].map(([v, l], i) => (
              <Reveal key={l} delay={i * 70} className="px-4 py-5 first:pl-0">
                <p className="num text-[26px] leading-none font-semibold text-pine-900"><Counter to={parseInt(v.replace(/\D/g, ""), 10)} />{v.includes("+") ? "+" : ""}</p>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-ink/50 uppercase">{l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ————— agenda ————— */}
      <section id="programme" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <SectionKicker>Programme</SectionKicker>
              <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Three days that<br />set the year&apos;s agenda</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/65">
                Keynotes, breakouts and the Livingstone Declaration. Full programme ships with your
                proceedings — here is the spine of the convention.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {settings.days.map((d, i) => (
                  <button
                    key={d.day}
                    onClick={() => setAgendaDay(i)}
                    className={`cursor-pointer rounded-md border px-4 py-2.5 font-mono text-[11.5px] font-medium tracking-wide uppercase transition-all ${
                      agendaDay === i
                        ? "border-pine-900 bg-pine-900 text-paper shadow-lg"
                        : "border-ink/15 text-ink/60 hover:border-ink/35 hover:text-ink"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="relative">
            <div key={agendaDay} className="fade-up space-y-2.5">
              {AGENDA[agendaDay].sessions.map((s, i) => (
                <Reveal key={s.title} delay={i * 60}>
                  <div className="group card flex items-center gap-5 px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <span className="num w-14 shrink-0 text-[13.5px] font-semibold text-copper-600">{s.time}</span>
                    <span className="h-8 w-px bg-ink/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{s.title}</p>
                      {s.speaker && <p className="mt-0.5 truncate text-[12.5px] text-ink/50">{s.speaker}</p>}
                    </div>
                    <span
                      className={`chip shrink-0 ${
                        s.kind === "Keynote"
                          ? "border-copper-500/40 bg-copper-100/60 text-copper-700"
                          : s.kind === "Social"
                            ? "border-ink/15 bg-mist text-ink/55"
                            : "border-pine-700/25 bg-pine-100/70 text-pine-800"
                      }`}
                    >
                      {s.kind}
                    </span>
                  </div>
                </Reveal>
              ))}
              <p className="pt-2 font-mono text-[11px] tracking-wide text-ink/40 uppercase">— {AGENDA[agendaDay].heading}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ————— fee packages ————— */}
      <section id="packages" className="relative scroll-mt-0 overflow-hidden bg-pine-950 text-paper">
        <div className="bg-chitenge-light absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <SectionKicker light>Delegate fees</SectionKicker>
                <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Three packages.<br />
                  <span className="text-copper-400">One standard of service.</span>
                </h2>
              </div>
              <div className="flex rounded-md border border-paper/20 bg-pine-900 p-1">
                {ACCOMMODATIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAcc(a.id)}
                    className={`cursor-pointer rounded px-3.5 py-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-all ${
                      acc === a.id ? "bg-copper-500 text-pine-950 shadow" : "text-paper/60 hover:text-paper"
                    }`}
                  >
                    {a.short}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-[14px] text-paper/60">
              All prices in Zambian Kwacha, VAT inclusive. Every package covers sessions, conference materials,
              teas, lunches and the gala dinner — accommodation adds two nights B&amp;B.
            </p>
          </Reveal>

          <div className="mt-10 overflow-hidden rounded-lg border border-paper/12">
            {PACKAGES.map((p, idx) => {
              const featured = p.id === "p1";
              return (
                <Reveal key={p.id} delay={idx * 90}>
                  <div
                    className={`grid gap-5 border-b border-paper/10 px-5 py-6 transition-colors last:border-b-0 sm:px-7 lg:grid-cols-[150px_1fr_auto] lg:items-center ${
                      featured ? "bg-pine-800/70" : "bg-pine-900/40 hover:bg-pine-900/70"
                    }`}
                  >
                    <div>
                      <p className="font-mono text-[10.5px] tracking-[0.22em] text-copper-300 uppercase">{p.code}</p>
                      <p className="mt-1 font-display text-2xl font-bold">{p.name}</p>
                      {featured && (
                        <span className="chip mt-2 border-copper-400/50 bg-copper-500/15 text-copper-300">
                          <Icon name="spark" size={11} /> Flagship
                        </span>
                      )}
                    </div>
                    <ul className="grid gap-x-6 gap-y-1.5 text-[13.5px] text-paper/75 sm:grid-cols-2">
                      {p.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2.5">
                          {perk.includes("shirt") ? (
                            <Icon name="shirt" size={14} className="shrink-0 text-copper-400" />
                          ) : perk.includes("power bank") ? (
                            <Icon name="battery" size={14} className="shrink-0 text-copper-400" />
                          ) : perk.includes("watch") ? (
                            <Icon name="watch" size={14} className="shrink-0 text-copper-400" />
                          ) : (
                            <Icon name="check" size={13} className="shrink-0 text-pine-500" />
                          )}
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-5 lg:flex-col lg:items-end lg:gap-2.5">
                      <div className="lg:text-right">
                        <p key={acc} className="fade-up num text-[27px] leading-none font-semibold text-copper-300">
                          {fmtK(p.prices[acc])}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-wide text-paper/45 uppercase">
                          {acc === "none" ? "no accommodation" : ACCOMMODATIONS.find((a) => a.id === acc)!.nights}
                        </p>
                      </div>
                      <button
                        className="btn h-10 bg-copper-500 px-5 text-[13px] text-pine-950 hover:bg-copper-400"
                        onClick={() => navigate("register", p.id)}
                      >
                        Select {p.code} <Icon name="arrowRight" size={15} />
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-4 font-mono text-[11px] tracking-wide text-paper/40 uppercase">
            Group bookings of 10+ — contact the treasury desk {TREASURY_PHONES.join(" / ")}
          </p>
        </div>
      </section>

      {/* ————— venues ————— */}
      <section id="stay" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal>
          <SectionKicker>Stay on the Zambezi</SectionKicker>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Two hotels, one shuttle loop</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7" delay={60}>
            <div className="group card relative overflow-hidden p-7 transition-all hover:-translate-y-1 hover:shadow-xl">
              <svg className="absolute -top-8 -right-8 h-44 w-44 text-pine-100 transition-transform duration-700 group-hover:rotate-12" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 60c10-8 18-8 28 0s18 8 28 0 18-8 28 0" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 72c10-8 18-8 28 0s18 8 28 0 18-8 28 0" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] text-copper-600 uppercase">
                <Icon name="bed" size={15} /> Partner hotel 01
              </div>
              <h3 className="mt-3 font-display text-[26px] font-bold text-ink">Radisson Blu Resort,<br />Mosi-oa-Tunya</h3>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink/65">
                Main convention hotel — riverside rooms, the session halls and the gala-dinner marquee
                are all on property. Delegates stay from <span className="num font-semibold text-pine-800">K22,500</span> all-in with Package 3.
              </p>
              <p className="num mt-4 font-mono text-[12px] text-ink/45">2 nights B&amp;B · conference rate locked at booking</p>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={140}>
            <div className="group card relative overflow-hidden bg-pine-900 p-7 text-paper transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="bg-dots-light absolute inset-0" />
              <div className="relative">
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] text-copper-300 uppercase">
                  <Icon name="bed" size={15} /> Partner hotel 02
                </div>
                <h3 className="mt-3 font-display text-[26px] font-bold">David Livingstone<br />Lodge &amp; Spa</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-paper/70">
                  The classic Zambezi safari lodge — spa, river cruises and a dedicated shuttle to
                  sessions every 30 minutes. From <span className="num font-semibold text-copper-300">K21,200</span> all-in with Package 3.
                </p>
                <p className="num mt-4 font-mono text-[12px] text-paper/45">2 nights B&amp;B · limited block of 180 rooms</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ————— payment & banking ————— */}
      <section id="payments" className="scroll-mt-20 border-t border-ink/10 bg-mist/50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <SectionKicker>How payment works</SectionKicker>
              <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Pay any of three banks</h2>
              <ol className="mt-7 space-y-4">
                {[
                  ["Complete the 5-step registration", "You'll receive a registration ID and a tax invoice instantly."],
                  ["Deposit fees to any account", "Quote your registration ID as the payment reference."],
                  ["Upload proof in step 4", "PDF, JPG or PNG up to 5 MB — treasury verifies within 48 h."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-900 font-mono text-[12.5px] font-semibold text-copper-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[14.5px] font-semibold text-ink">{t}</p>
                      <p className="mt-0.5 text-[13px] text-ink/60">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 rounded-md border border-copper-500/30 bg-copper-100/50 p-4">
                <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-copper-700 uppercase">
                  <Icon name="phone" size={14} /> Treasury desk
                </p>
                <p className="num mt-2 text-lg font-semibold text-ink">{TREASURY_PHONES.join("  ·  ")}</p>
                <p className="mt-1 text-[12.5px] text-ink/60">Mon–Sat, 08:00–17:00 CAT · payment queries &amp; group bookings</p>
              </div>
            </div>
          </Reveal>
          <div className="space-y-4">
            {BANKS.map((b, i) => (
              <Reveal key={b.id} delay={i * 90}>
                <div className="card group flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-pine-900 text-copper-300">
                    <Icon name="bank" size={22} />
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <p className="font-display text-[17px] font-bold text-ink">{b.name}</p>
                    <p className="text-[12.5px] text-ink/55">{b.accountName} · {b.branch} · SWIFT {b.swift}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-mono text-[9.5px] tracking-[0.2em] text-ink/40 uppercase">Account no.</p>
                      <p className="num text-[16px] font-semibold tracking-wide text-pine-900">{b.accountNo}</p>
                    </div>
                    <button
                      onClick={() => copy(b.accountNo, `${b.short} account number`)}
                      className="btn-ghost h-9 w-9 px-0"
                      aria-label={`Copy ${b.short} account number`}
                      title="Copy account number"
                    >
                      <Icon name="copy" size={15} />
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={280}>
              <div className="rounded-lg border-2 border-dashed border-pine-700/25 bg-pine-100/40 px-6 py-5">
                <p className="text-[14px] text-pine-900">
                  <strong className="font-semibold">Mobile money also accepted</strong> — use the pay-bill prompts in step 4 of
                  registration. Invoice and email confirmation are issued the moment you submit.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ————— closing CTA ————— */}
      <section className="bg-chitenge relative overflow-hidden bg-pine-900 text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16">
          <Reveal>
            <div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-[44px]">
                The desk closes when<br />the last seat is taken.
              </h2>
              <p className="num mt-3 font-mono text-[12.5px] tracking-wide text-paper/60">
                {seatsTaken} registered · {settings.capacity - seatsTaken} seats remaining · {settings.dates}
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <button className="btn-copper h-13 px-8 text-[16px]" onClick={() => navigate("register")}>
              Start registration <Icon name="arrowRight" size={18} />
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
