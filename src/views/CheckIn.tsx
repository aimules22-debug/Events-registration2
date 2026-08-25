/* ============================================================
 * Check-In desk — staff-only attendance interface.
 * Lookup by NRC / membership number / name, single-action
 * attendance marking per convention day with staff attribution,
 * live totals and an activity feed.
 * ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { ACCOMMODATIONS, PACKAGES, currentDay, fmtTime, normalizeNrc, type Day, type Registration } from "../lib/data";
import { useStore } from "../lib/store";
import { Counter, Icon, PayChip, PkgBadge } from "../components/ui";

export default function CheckIn() {
  const { registrations, checkins, settings, session, checkIn, toast } = useStore();
  const [query, setQuery] = useState("");
  const [day, setDay] = useState<Day>(currentDay(settings));
  const [lastAction, setLastAction] = useState<{ reg: Registration; day: Day } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  /* search across NRC (normalized), membership number, name, reg id */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const qn = normalizeNrc(q);
    return registrations
      .filter((r) => {
        const hay = `${r.firstName} ${r.lastName}`.toLowerCase();
        return (
          hay.includes(q) ||
          r.membershipNo.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (qn.length >= 4 && normalizeNrc(r.nrc).includes(qn))
        );
      })
      .slice(0, 6);
  }, [query, registrations]);

  const [selected, setSelected] = useState<Registration | null>(null);
  const selCheckins = selected ? checkins.filter((c) => c.registrationId === selected.id) : [];
  const alreadyToday = selected ? selCheckins.some((c) => c.day === day) : false;

  const dayCount = (d: Day) => checkins.filter((c) => c.day === d).length;
  const uniqueIn = useMemo(() => new Set(checkins.map((c) => c.registrationId)).size, [checkins]);
  const rate = registrations.length ? Math.round((uniqueIn / registrations.length) * 100) : 0;

  const recent = useMemo(
    () => [...checkins].sort((a, b) => b.at - a.at).slice(0, 9),
    [checkins],
  );

  const mark = (reg: Registration) => {
    const res = checkIn(reg.id, day);
    if (!res.ok) {
      toast("warning", "Check-in blocked", res.error);
      return;
    }
    setLastAction({ reg, day });
    toast("success", "Attendance marked", `${reg.firstName} ${reg.lastName} — Day ${day} at ${fmtTime(Date.now())}.`);
    // hold the stamped card briefly for visual confirmation, then reset for the next delegate
    setTimeout(() => {
      setLastAction(null);
      setSelected(null);
      setQuery("");
      inputRef.current?.focus();
    }, 2300);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-9">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-copper-600 uppercase">Front desk · {session?.title}</p>
          <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-ink">Check-in</h1>
        </div>
        <div className="flex rounded-md border border-ink/15 bg-white p-1">
          {settings.days.map((d) => (
            <button
              key={d.day}
              onClick={() => setDay(d.day)}
              className={`cursor-pointer rounded px-3.5 py-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-all ${
                day === d.day ? "bg-pine-900 text-paper shadow" : "text-ink/55 hover:text-ink"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* stat strip */}
      <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink/10 bg-ink/10 sm:grid-cols-4">
        {[
          [String(dayCount(day)), `checked in · day ${day}`],
          [String(uniqueIn), "unique delegates in"],
          [`${rate}%`, "of registered"],
          [String(registrations.length), "total registered"],
        ].map(([v, l]) => (
          <div key={l} className="bg-white px-5 py-4">
            <p className="num text-[26px] leading-none font-semibold text-pine-900"><Counter to={parseInt(v, 10) || 0} duration={700} />{v.endsWith("%") ? "%" : ""}</p>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink/45 uppercase">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* lookup column */}
        <div>
          <div className="relative">
            <Icon name="search" size={19} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink/35" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Search NRC, membership no., name or registration ID…"
              className="field h-13 pl-11 text-[15px] shadow-[0_10px_30px_-18px_rgba(19,28,23,0.4)]"
              aria-label="Participant lookup"
            />
            <kbd className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border border-ink/15 bg-mist px-1.5 py-0.5 font-mono text-[10px] text-ink/45 sm:block">autofocus</kbd>
          </div>

          {/* results */}
          {query.trim().length >= 2 && !selected && (
            <div className="card fade-up mt-4 overflow-hidden">
              {results.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-flag/10 text-flag"><Icon name="alert" size={20} /></p>
                  <p className="mt-3 font-display text-lg font-bold text-ink">No matching delegate</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink/55">
                    Check the NRC format (123456/78/9) or search by surname. Unregistered delegates must complete
                    registration before entering the hall.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink/8">
                  {results.map((r) => {
                    const done = checkins.some((c) => c.registrationId === r.id && c.day === day);
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => setSelected(r)}
                          className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition hover:bg-pine-900/[0.05]"
                        >
                          <Avatar name={`${r.firstName} ${r.lastName}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-semibold text-ink">{r.firstName} {r.lastName}</p>
                            <p className="num truncate text-[12px] text-ink/50">{r.id} · NRC {r.nrc} · {r.membershipNo}</p>
                          </div>
                          <PkgBadge pkgId={r.packageId} />
                          {done ? (
                            <span className="chip border-pine-700/30 bg-pine-100 text-pine-800"><Icon name="check" size={11} /> in</span>
                          ) : (
                            <span className="chip border-ink/15 text-ink/45">pending</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* selected delegate card */}
          {selected && (
            <div key={selected.id} className="card fade-up relative mt-4 overflow-hidden">
              <div className="bg-pine-900 px-6 py-5 text-paper">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar name={`${selected.firstName} ${selected.lastName}`} big />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[22px] leading-tight font-bold">{selected.firstName} {selected.lastName}</p>
                    <p className="mt-0.5 text-[12.5px] text-paper/60">{selected.jobTitle} — {selected.employer}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setQuery(""); }} className="btn-ghost-light h-9 w-9 px-0" aria-label="Clear selection">
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-3 px-6 py-5 text-[13px] sm:grid-cols-2">
                <p><span className="label mb-0.5">Registration</span><span className="num block font-semibold text-ink">{selected.id}</span></p>
                <p><span className="label mb-0.5">NRC / membership</span><span className="num block font-semibold text-ink">{selected.nrc} · {selected.membershipNo}</span></p>
                <p><span className="label mb-0.5">Package</span><span className="mt-0.5 flex items-center gap-2"><PkgBadge pkgId={selected.packageId} /><span className="font-medium">{PACKAGES.find((p) => p.id === selected.packageId)!.name}</span></span></p>
                <p><span className="label mb-0.5">Accommodation</span><span className="block font-medium">{ACCOMMODATIONS.find((a) => a.id === selected.accommodationId)!.name}</span></p>
                <p><span className="label mb-0.5">Payment</span><span className="mt-0.5 block"><PayChip status={selected.paymentStatus} /></span></p>
                <p><span className="label mb-0.5">Per-day status</span>
                  <span className="mt-1 flex gap-1.5">
                    {([1, 2, 3] as Day[]).map((d) => {
                      const done = selCheckins.some((c) => c.day === d);
                      return (
                        <span key={d} className={`chip ${done ? "border-pine-700/30 bg-pine-100 text-pine-800" : "border-ink/15 text-ink/40"}`}>
                          D{d}{done && <Icon name="check" size={10} />}
                        </span>
                      );
                    })}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-ink/10 bg-mist/50 px-6 py-4">
                <p className="text-[12px] text-ink/50">
                  Marking as <strong className="text-ink">{session?.name}</strong> · {settings.days[day - 1].label}
                </p>
                <button
                  className={`btn h-12 px-7 text-[15px] ${alreadyToday ? "btn-ghost" : "btn-copper"}`}
                  onClick={() => mark(selected)}
                  disabled={alreadyToday}
                >
                  {alreadyToday ? (<><Icon name="check" size={17} /> Checked in · {fmtTime(selCheckins.find((c) => c.day === day)!.at)}</>) : (<>Mark attendance <Icon name="clipboard" size={17} /></>)}
                </button>
              </div>
              {lastAction && lastAction.reg.id === selected.id && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/70 backdrop-blur-[1px]">
                  <p className="stamp-in flex items-center gap-3 rounded-lg border-[3px] border-pine-700 bg-paper px-8 py-3 font-display text-3xl font-extrabold tracking-[0.12em] text-pine-700 uppercase" style={{ borderStyle: "double" }}>
                    <Icon name="check" size={28} strokeWidth={2.6} /> Day {day}
                  </p>
                </div>
              )}
            </div>
          )}

          {lastAction && !selected && (
            <div className="fade-up mt-4 flex items-center gap-3 rounded-lg border border-pine-700/30 bg-pine-100/60 px-5 py-3.5">
              <Icon name="check" size={18} className="text-pine-700" />
              <p className="text-[13.5px] font-medium text-pine-900">
                {lastAction.reg.firstName} {lastAction.reg.lastName} checked in for Day {lastAction.day} — badge printed at Gate.
              </p>
            </div>
          )}

          {!selected && query.trim().length < 2 && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-ink/15 px-6 py-10 text-center">
              <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-pine-800"><Icon name="qr" size={22} /></p>
              <p className="mt-3 font-display text-lg font-bold text-ink">Scan or search to begin</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink/55">
                Type at least 2 characters — results match NRC, membership number, name or registration ID.
              </p>
            </div>
          )}
        </div>

        {/* live feed column */}
        <aside className="space-y-5">
          <div className="card p-5">
            <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-copper-500" /> Live feed
            </p>
            <ul className="mt-3 max-h-[430px] divide-y divide-ink/8 overflow-y-auto">
              {recent.length === 0 && <li className="py-6 text-center text-[13px] text-ink/45">No check-ins recorded yet.</li>}
              {recent.map((c) => {
                const r = registrations.find((x) => x.id === c.registrationId);
                if (!r) return null;
                return (
                  <li key={c.id} className="fade-up flex items-center gap-3 py-2.5">
                    <Avatar name={`${r.firstName} ${r.lastName}`} small />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{r.firstName} {r.lastName}</p>
                      <p className="text-[11px] text-ink/45">by {c.staffName}</p>
                    </div>
                    <div className="text-right">
                      <p className="num text-[12px] font-semibold text-pine-800">Day {c.day}</p>
                      <p className="num text-[11px] text-ink/45">{fmtTime(c.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-lg bg-pine-900 p-5 text-paper">
            <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-copper-300 uppercase">Desk protocol</p>
            <ul className="mt-3 space-y-2.5 text-[12.5px] text-paper/75">
              <li className="flex gap-2.5"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-copper-400" /> One mark per delegate per day — the system blocks repeats.</li>
              <li className="flex gap-2.5"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-copper-400" /> Payment status is advisory; admit delegates whose payment is pending.</li>
              <li className="flex gap-2.5"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-copper-400" /> Every mark is timestamped and attributed to your staff account.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Avatar({ name, big = false, small = false }: { name: string; big?: boolean; small?: boolean }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const size = big ? "h-14 w-14 text-lg" : small ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-[13px]";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-copper-500 font-display font-bold text-pine-950 ${size}`}>
      {initials}
    </span>
  );
}
