/* ============================================================
 * Report viewer — read-only attendance analytics with filters,
 * charts and Excel export. Available to the "reports" role
 * (and organizer) only.
 * ============================================================ */

import { useMemo, useState } from "react";
import {
  ACCOMMODATIONS,
  PACKAGES,
  downloadCSV,
  fmtDate,
  fmtK,
  fmtTime,
  type Day,
} from "../lib/data";
import { useStore } from "../lib/store";
import { BarRows, Donut, Icon } from "../components/ui";

export default function Reports() {
  const { registrations, checkins, settings, logExport, toast } = useStore();
  const [fDay, setFDay] = useState<"all" | Day>("all");
  const [fPkg, setFPkg] = useState<"all" | "p1" | "p2" | "p3">("all");

  const regs = useMemo(
    () => registrations.filter((r) => fPkg === "all" || r.packageId === fPkg),
    [registrations, fPkg],
  );

  const cins = useMemo(() => {
    const regIds = new Set(regs.map((r) => r.id));
    return checkins.filter((c) => regIds.has(c.registrationId) && (fDay === "all" || c.day === fDay));
  }, [checkins, regs, fDay]);

  const byDay = settings.days.map((d) => ({
    day: d.day,
    label: d.label.replace(" · ", "\n"),
    count: checkins.filter((c) => c.day === d.day).length,
  }));
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  const pkgSegments = PACKAGES.map((p) => ({
    label: `${p.code} ${p.name}`,
    value: regs.filter((r) => r.packageId === p.id).length,
    color: p.id === "p1" ? "#0B3227" : p.id === "p2" ? "#2C8A67" : "#B7C9BE",
  }));

  const accBars = ACCOMMODATIONS.map((a, i) => ({
    label: a.short,
    value: regs.filter((r) => r.accommodationId === a.id).length,
    color: ["#B7C9BE", "#D4761C", "#0B3227"][i],
  }));

  const employers = useMemo(() => {
    const map = new Map<string, number>();
    regs.forEach((r) => map.set(r.employer, (map.get(r.employer) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, color: "#175941" }));
  }, [regs]);

  const revenueByPkg = PACKAGES.map((p) => ({
    label: `${p.code} — ${p.name}`,
    value: regs.filter((r) => r.packageId === p.id && r.paymentStatus !== "rejected").reduce((a, r) => a + r.total, 0),
    color: p.id === "p1" ? "#B45E15" : p.id === "p2" ? "#114534" : "#8FAE9D",
  }));

  const register = useMemo(
    () =>
      [...cins]
        .sort((a, b) => b.at - a.at)
        .map((c) => ({ c, r: registrations.find((x) => x.id === c.registrationId)! }))
        .filter((x) => x.r),
    [cins, registrations],
  );

  const exportAttendance = () => {
    downloadCSV(
      `zihrm2026-attendance-day${fDay === "all" ? "-all" : fDay}.csv`,
      ["Day", "Time", "Registration ID", "Delegate", "Employer", "Package", "Accommodation", "Checked in by"],
      register.map(({ c, r }) => [
        `Day ${c.day}`, `${fmtDate(c.at)} ${fmtTime(c.at)}`, r.id, `${r.firstName} ${r.lastName}`,
        r.employer, PACKAGES.find((p) => p.id === r.packageId)!.name,
        ACCOMMODATIONS.find((a) => a.id === r.accommodationId)!.short, c.staffName,
      ]),
    );
    logExport(`attendance (Day ${fDay === "all" ? "1–3" : fDay})`);
    toast("success", "Export ready", `${register.length} attendance rows exported to CSV.`);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-copper-600 uppercase">Read-only analytics · {useName()}</p>
          <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-ink">Attendance reports</h1>
        </div>
        <span className="chip border-copper-500/40 bg-copper-100 text-copper-700"><Icon name="eye" size={12} /> Report viewer role</span>
      </div>

      {/* filters */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-ink/15 bg-white p-1">
          {(["all", 1, 2, 3] as const).map((d) => (
            <button
              key={String(d)}
              onClick={() => setFDay(d)}
              className={`cursor-pointer rounded px-3.5 py-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-all ${
                fDay === d ? "bg-pine-900 text-paper shadow" : "text-ink/55 hover:text-ink"
              }`}
            >
              {d === "all" ? "All days" : `Day ${d}`}
            </button>
          ))}
        </div>
        <select className="field w-auto" value={fPkg} onChange={(e) => setFPkg(e.target.value as typeof fPkg)} aria-label="Filter by package">
          <option value="all">All packages</option>
          {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <div className="ml-auto">
          <button className="btn-pine h-11" onClick={exportAttendance}><Icon name="download" size={16} /> Export attendance</button>
        </div>
      </div>

      {/* headline numbers */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink/10 bg-ink/10 lg:grid-cols-4">
        {[
          [String(regs.length), "delegates in scope"],
          [String(cins.length), "check-in marks"],
          [String(new Set(cins.map((c) => c.registrationId)).size), "unique attendees"],
          [fmtK(regs.filter((r) => r.paymentStatus !== "rejected").reduce((a, r) => a + r.total, 0)), "gross fees (unrejected)"],
        ].map(([v, l]) => (
          <div key={l} className="bg-white px-5 py-4">
            <p className="num text-[24px] leading-none font-semibold text-pine-900">{v}</p>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink/45 uppercase">{l}</p>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Check-ins per day</p>
          <div className="mt-6 flex h-44 items-end gap-5 px-2">
            {byDay.map((d) => (
              <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-[13px] font-semibold text-ink opacity-0 transition group-hover:opacity-100">{d.count}</span>
                <div
                  className="bar-fill w-full rounded-t-md bg-pine-800 transition group-hover:bg-copper-500"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                />
                <span className="font-mono text-[9.5px] tracking-wide whitespace-pre text-center text-ink/45 uppercase">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Package distribution</p>
          <div className="mt-5">
            <Donut segments={pkgSegments} centerLabel={String(regs.length)} centerSub="delegates" />
          </div>
        </div>
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Accommodation uptake</p>
          <div className="mt-5"><BarRows items={accBars} /></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Top employers</p>
          <div className="mt-5"><BarRows items={employers} /></div>
        </div>
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Fee revenue by package (ZMW)</p>
          <div className="mt-5"><BarRows items={revenueByPkg} unit={fmtK} /></div>
        </div>
      </div>

      {/* attendance register */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">
            Attendance register — {fDay === "all" ? "all days" : `day ${fDay}`} · {register.length} marks
          </p>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          <table className="tbl w-full">
            <thead className="sticky top-0 bg-mist/95 backdrop-blur">
              <tr><th>Day</th><th>Time</th><th>Delegate</th><th>Employer</th><th>Package</th><th>Marked by</th></tr>
            </thead>
            <tbody>
              {register.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-ink/45">No attendance marks for this filter yet.</td></tr>
              )}
              {register.map(({ c, r }) => (
                <tr key={c.id}>
                  <td><span className="chip border-pine-700/25 bg-pine-100 text-pine-800">D{c.day}</span></td>
                  <td className="num text-[12.5px] text-ink/60">{fmtTime(c.at)}</td>
                  <td><p className="font-semibold text-ink">{r.firstName} {r.lastName}</p><p className="num text-[11px] text-ink/40">{r.id}</p></td>
                  <td className="max-w-[180px] truncate text-[12.5px] text-ink/65">{r.employer}</td>
                  <td className="num text-[12.5px] text-ink/65">{PACKAGES.find((p) => p.id === r.packageId)!.code}</td>
                  <td className="text-[12.5px] text-ink/65">{c.staffName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function useName() {
  return useStore().session?.name ?? "";
}
