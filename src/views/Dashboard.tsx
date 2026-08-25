/* ============================================================
 * Organizer dashboard — registrations, payment verification,
 * audit trail, user/role management and event configuration.
 * ============================================================ */

import { useMemo, useState } from "react";
import {
  ACCOMMODATIONS,
  PACKAGES,
  ROLE_META,
  downloadCSV,
  fmtDate,
  fmtK,
  fmtTime,
  timeAgo,
  type Activity,
  type Registration,
  type Role,
} from "../lib/data";
import { useStore } from "../lib/store";
import { BarRows, Donut, Icon, InvoiceModal, Modal, PayChip, PkgBadge, type IconName } from "../components/ui";

type Tab = "overview" | "registrations" | "activity" | "users" | "settings";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "chart" },
  { id: "registrations", label: "Registrations", icon: "users" },
  { id: "activity", label: "Activity log", icon: "clock" },
  { id: "users", label: "Users & roles", icon: "shield" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

export default function Dashboard() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="mx-auto max-w-6xl px-5 py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-copper-600 uppercase">Organizer console · {store.session?.name}</p>
          <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-ink">Event control</h1>
        </div>
        <nav className="flex flex-wrap gap-1.5 rounded-lg border border-ink/12 bg-white p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-all ${
                tab === t.id ? "bg-pine-900 text-paper shadow" : "text-ink/55 hover:bg-mist hover:text-ink"
              }`}
            >
              <Icon name={t.icon} size={14} /> <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div key={tab} className="fade-up mt-8">
        {tab === "overview" && <Overview />}
        {tab === "registrations" && <Registrations />}
        {tab === "activity" && <ActivityLog />}
        {tab === "users" && <UsersTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

/* ————— overview ————— */

function Overview() {
  const { registrations, checkins, activity, settings } = useStore();
  const verified = registrations.filter((r) => r.paymentStatus === "verified");
  const pending = registrations.filter((r) => r.paymentStatus === "pending");
  const revenueV = verified.reduce((a, r) => a + r.total, 0);
  const revenueP = pending.reduce((a, r) => a + r.total, 0);
  const uniqueIn = new Set(checkins.map((c) => c.registrationId)).size;

  const stats: { label: string; value: string; sub: string; icon: IconName }[] = [
    { label: "Registrations", value: String(registrations.length), sub: `${settings.capacity - registrations.length} seats left`, icon: "users" },
    { label: "Revenue verified", value: fmtK(revenueV), sub: `${verified.length} payments cleared`, icon: "bank" },
    { label: "Awaiting verification", value: fmtK(revenueP), sub: `${pending.length} proofs in queue`, icon: "clock" },
    { label: "Checked in (unique)", value: String(uniqueIn), sub: `${registrations.length ? Math.round((uniqueIn / registrations.length) * 100) : 0}% of registered`, icon: "clipboard" },
  ];

  const pkgCounts = PACKAGES.map((p) => ({
    label: `${p.code} — ${p.name}`,
    value: registrations.filter((r) => r.packageId === p.id).length,
    color: p.id === "p1" ? "#0B3227" : p.id === "p2" ? "#2C8A67" : "#B7C9BE",
  }));

  const accCounts = ACCOMMODATIONS.map((a, i) => ({
    label: a.short,
    value: registrations.filter((r) => r.accommodationId === a.id).length,
    color: ["#B7C9BE", "#D4761C", "#0B3227"][i],
  }));

  const latest = [...registrations].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="card fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-ink/45 uppercase">{s.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine-100 text-pine-800"><Icon name={s.icon} size={16} /></span>
            </div>
            <p className="num mt-3 text-[27px] leading-none font-semibold text-ink">{s.value}</p>
            <p className="mt-1.5 text-[12px] text-ink/50">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Package mix</p>
          <div className="mt-4">
            <Donut
              segments={pkgCounts.map((p) => ({ label: p.label, value: p.value, color: p.color }))}
              centerLabel={String(registrations.length)}
              centerSub="delegates"
            />
          </div>
        </div>
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Accommodation uptake</p>
          <div className="mt-5"><BarRows items={accCounts} /></div>
          <p className="mt-5 border-t border-ink/8 pt-4 text-[12px] leading-relaxed text-ink/50">
            Hotel blocks: Radisson Blu 320 rooms · David Livingstone 180 rooms. Release unsold blocks 72 h before Day 1.
          </p>
        </div>
        <div className="card overflow-hidden">
          <p className="border-b border-ink/8 px-6 py-4 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Latest registrations</p>
          <ul className="divide-y divide-ink/8">
            {latest.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{r.firstName} {r.lastName}</p>
                  <p className="num text-[11.5px] text-ink/45">{r.id} · {timeAgo(r.createdAt)}</p>
                </div>
                <PkgBadge pkgId={r.packageId} />
                <PayChip status={r.paymentStatus} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card overflow-hidden">
        <p className="border-b border-ink/8 px-6 py-4 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Recent audit trail</p>
        <ul className="divide-y divide-ink/8">
          {activity.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-6 py-3 text-[13px]">
              <TypeDot type={a.type} />
              <span className="min-w-0 flex-1 truncate text-ink/75">{a.message}</span>
              <span className="shrink-0 text-ink/40">{a.actor}</span>
              <span className="num w-16 shrink-0 text-right text-[11.5px] text-ink/40">{timeAgo(a.at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TypeDot({ type }: { type: Activity["type"] }) {
  const map: Record<Activity["type"], string> = {
    registration: "bg-copper-500",
    checkin: "bg-pine-600",
    payment: "bg-gold",
    export: "bg-ink/50",
    auth: "bg-pine-800",
    system: "bg-ink/30",
    settings: "bg-flag",
  };
  return <span className={`h-2 w-2 shrink-0 rounded-full ${map[type]}`} title={type} />;
}

/* ————— registrations table ————— */

type SortKey = "createdAt" | "name" | "total";

function Registrations() {
  const { registrations, setPaymentStatus, logExport, toast, settings } = useStore();
  const [q, setQ] = useState("");
  const [fPkg, setFPkg] = useState("all");
  const [fAcc, setFAcc] = useState("all");
  const [fPay, setFPay] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [invoice, setInvoice] = useState<Registration | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = registrations.filter((r) => {
      if (fPkg !== "all" && r.packageId !== fPkg) return false;
      if (fAcc !== "all" && r.accommodationId !== fAcc) return false;
      if (fPay !== "all" && r.paymentStatus !== fPay) return false;
      if (!s) return true;
      return `${r.firstName} ${r.lastName} ${r.email} ${r.id} ${r.membershipNo} ${r.employer} ${r.nrc}`.toLowerCase().includes(s);
    });
    list.sort((a, b) => {
      const v =
        sort.key === "name"
          ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          : sort.key === "total"
            ? a.total - b.total
            : a.createdAt - b.createdAt;
      return v * sort.dir;
    });
    return list;
  }, [registrations, q, fPkg, fAcc, fPay, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "createdAt" ? -1 : 1 }));

  const exportCSV = () => {
    downloadCSV(
      `zihrm2026-registrations-${fmtDate(Date.now()).replace(/ /g, "-")}.csv`,
      ["Registration ID", "Invoice", "Date", "First name", "Surname", "Email", "Phone", "Gender", "Employer", "Job title", "District", "NRC", "Membership no", "Member status", "Package", "Accommodation", "Total (ZMW)", "Pay method", "Pay ref", "Payment status"],
      filtered.map((r) => [
        r.id, r.invoiceNo, fmtDate(r.createdAt), r.firstName, r.lastName, r.email, r.phone, r.gender,
        r.employer, r.jobTitle, r.district, r.nrc, r.membershipNo, r.memberStatus,
        PACKAGES.find((p) => p.id === r.packageId)!.name,
        ACCOMMODATIONS.find((a) => a.id === r.accommodationId)!.short,
        r.total, r.payMethod, r.payRef, r.paymentStatus,
      ]),
    );
    logExport(`${filtered.length} registrations`);
    toast("success", "Export ready", `${filtered.length} rows written to Excel-compatible CSV.`);
  };

  const SortTh = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={className}>
      <button onClick={() => toggleSort(k)} className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-ink">
        {children}
        {sort.key === k && <Icon name="chevronDown" size={11} className={`transition-transform ${sort.dir === 1 ? "rotate-180" : ""}`} />}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, NRC, email, ID, employer…" className="field pl-10" />
        </div>
        <select className="field w-auto" value={fPkg} onChange={(e) => setFPkg(e.target.value)} aria-label="Filter package">
          <option value="all">All packages</option>
          {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <select className="field w-auto" value={fAcc} onChange={(e) => setFAcc(e.target.value)} aria-label="Filter accommodation">
          <option value="all">All accommodation</option>
          {ACCOMMODATIONS.map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
        </select>
        <select className="field w-auto" value={fPay} onChange={(e) => setFPay(e.target.value)} aria-label="Filter payment">
          <option value="all">All payments</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn-pine h-11" onClick={exportCSV}>
          <Icon name="download" size={16} /> Export Excel
        </button>
      </div>

      {/* table */}
      <div className="card overflow-x-auto">
        <table className="tbl w-full min-w-[880px]">
          <thead className="bg-mist/50">
            <tr>
              <th>ID / Invoice</th>
              <SortTh k="name">Delegate</SortTh>
              <th>Employer</th>
              <th>Package</th>
              <th>Accomm.</th>
              <SortTh k="total">Total</SortTh>
              <th>Payment</th>
              <SortTh k="createdAt">Date</SortTh>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-ink/45">No registrations match the current filters.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><p className="num text-[12.5px] font-semibold text-ink">{r.id}</p><p className="num text-[11px] text-ink/40">{r.invoiceNo}</p></td>
                <td>
                  <p className="font-semibold text-ink">{r.firstName} {r.lastName}</p>
                  <p className="num text-[11.5px] text-ink/45">{r.membershipNo} · NRC {r.nrc}</p>
                </td>
                <td><p className="max-w-[160px] truncate text-[12.5px] text-ink/65">{r.employer}</p><p className="text-[11px] text-ink/40">{r.district}</p></td>
                <td><PkgBadge pkgId={r.packageId} /></td>
                <td className="text-[12.5px] text-ink/65">{ACCOMMODATIONS.find((a) => a.id === r.accommodationId)!.short}</td>
                <td className="num font-semibold text-ink">{fmtK(r.total)}</td>
                <td>
                  <PayChip status={r.paymentStatus} />
                  <p className="num mt-1 text-[11px] text-ink/40">{r.payRef}</p>
                </td>
                <td className="num text-[12px] text-ink/55">{fmtDate(r.createdAt)}<br />{fmtTime(r.createdAt)}</td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <button className="btn-ghost h-8 w-8 px-0" title="View invoice" onClick={() => setInvoice(r)}><Icon name="eye" size={14} /></button>
                    {r.paymentStatus === "pending" ? (
                      <>
                        <button className="btn h-8 bg-pine-800 px-2.5 text-[11.5px] text-paper hover:bg-pine-700" onClick={() => { setPaymentStatus(r.id, "verified"); toast("success", "Payment verified", `${r.id} · ${fmtK(r.total)}`); }}>
                          <Icon name="check" size={13} /> Verify
                        </button>
                        <button className="btn h-8 border border-flag/35 px-2.5 text-[11.5px] text-flag hover:bg-flag/10" onClick={() => { setPaymentStatus(r.id, "rejected"); toast("warning", "Payment rejected", `${r.id} — delegate notified by email.`); }}>
                          <Icon name="x" size={13} /> Reject
                        </button>
                      </>
                    ) : (
                      <button className="btn-ghost h-8 px-2.5 text-[11.5px]" onClick={() => setPaymentStatus(r.id, "pending")}>
                        <Icon name="refresh" size={12} /> Re-queue
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="num font-mono text-[11.5px] text-ink/45">
        Showing {filtered.length} of {registrations.length} registrations · combined value {fmtK(filtered.reduce((a, r) => a + r.total, 0))}
      </p>
      {invoice && <InvoiceModal reg={invoice} settings={settings} onClose={() => setInvoice(null)} />}
    </div>
  );
}

/* ————— activity log ————— */

function ActivityLog() {
  const { activity } = useStore();
  const [filter, setFilter] = useState<"all" | Activity["type"]>("all");
  const types: Activity["type"][] = ["registration", "checkin", "payment", "export", "auth", "settings", "system"];
  const list = activity.filter((a) => filter === "all" || a.type === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...types] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`chip cursor-pointer transition-all ${filter === t ? "border-pine-900 bg-pine-900 text-paper" : "border-ink/15 bg-white text-ink/55 hover:border-ink/35"}`}
          >
            {t === "all" ? `All (${activity.length})` : t}
          </button>
        ))}
      </div>
      <div className="card divide-y divide-ink/8">
        {list.length === 0 && <p className="px-6 py-12 text-center text-ink/45">No events of this type yet.</p>}
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-4 px-6 py-3.5">
            <TypeDot type={a.type} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{a.message}</p>
              <p className="mt-0.5 text-[11.5px] text-ink/45">{a.actor} · <span className="font-mono uppercase">{a.type}</span></p>
            </div>
            <p className="num shrink-0 text-[11.5px] text-ink/45">{fmtDate(a.at)} {fmtTime(a.at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ————— users & roles ————— */

function UsersTab() {
  const { users, session, setRole, addUser, toast } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState<Role>("checkin");

  const change = (userId: string, next: Role) => {
    if (userId === session?.id && next !== "organizer") {
      toast("warning", "Self-demotion blocked", "You cannot remove your own organizer access while signed in.");
      return;
    }
    setRole(userId, next);
    toast("success", "Role updated", `${users.find((u) => u.id === userId)?.name} is now ${ROLE_META[next].label}.`);
  };

  const add = () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast("error", "Check the form", "A valid name and email are required.");
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      toast("error", "Email already in use", "Each staff account needs a unique email.");
      return;
    }
    addUser(name.trim(), email.trim().toLowerCase(), role);
    toast("success", "Staff account created", `${name} can sign in with password “demo123”.`);
    setName("");
    setEmail("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card divide-y divide-ink/8">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pine-900 font-display text-[13px] font-bold text-copper-300">
              {u.name.split(" ").map((p) => p[0]).join("").toUpperCase()}
            </span>
            <div className="min-w-[180px] flex-1">
              <p className="text-[14.5px] font-semibold text-ink">{u.name} {u.id === session?.id && <span className="chip ml-1 border-copper-500/40 bg-copper-100 text-copper-700">you</span>}</p>
              <p className="text-[12px] text-ink/50">{u.email} · {u.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`chip ${u.role === "organizer" ? "border-pine-700/30 bg-pine-100 text-pine-800" : u.role === "checkin" ? "border-copper-500/40 bg-copper-100 text-copper-700" : "border-ink/15 text-ink/55"}`}>
                {ROLE_META[u.role].label}
              </span>
              <select className="field h-9 w-auto text-[12.5px]" value={u.role} onChange={(e) => change(u.id, e.target.value as Role)} aria-label={`Change role for ${u.name}`}>
                {(Object.keys(ROLE_META) as Role[]).map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <div className="card h-fit p-6">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Add staff account</p>
        <div className="mt-4 space-y-4">
          <div><label className="label">Full name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chanda Mwansa" /></div>
          <div><label className="label">Email</label><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@zihrm.org.zm" /></div>
          <div>
            <label className="label">Role</label>
            <select className="field" value={role} onChange={(e) => setRoleSel(e.target.value as Role)}>
              {(Object.keys(ROLE_META) as Role[]).map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/50">{ROLE_META[role].blurb}</p>
          </div>
          <button className="btn-pine w-full" onClick={add}><Icon name="plus" size={16} /> Create account</button>
        </div>
      </div>
    </div>
  );
}

/* ————— settings ————— */

function SettingsTab() {
  const { settings, updateSettings, resetDemo, toast } = useStore();
  const [draft, setDraft] = useState({
    name: settings.name,
    theme: settings.theme,
    venue: settings.venue,
    city: settings.city,
    dates: settings.dates,
    capacity: settings.capacity,
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const save = () => {
    updateSettings({ ...draft, capacity: Math.max(100, draft.capacity) });
    toast("success", "Event configuration saved", "Changes are live across the portal immediately.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card p-6">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Event configuration</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Event name</label><input className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Theme</label><input className="field" value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })} /></div>
          <div><label className="label">Venue</label><input className="field" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} /></div>
          <div><label className="label">City</label><input className="field" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
          <div><label className="label">Dates (display)</label><input className="field" value={draft.dates} onChange={(e) => setDraft({ ...draft, dates: e.target.value })} /></div>
          <div><label className="label">Capacity</label><input type="number" className="field num" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: parseInt(e.target.value, 10) || 0 })} /></div>
        </div>
        <button className="btn-copper mt-6" onClick={save}><Icon name="check" size={16} /> Save configuration</button>
      </div>
      <div className="space-y-6">
        <div className="card p-6">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink/50 uppercase">Fee packages</p>
          <ul className="mt-3 divide-y divide-ink/8 text-[13px]">
            {PACKAGES.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-ink">{p.code} — {p.name}</span>
                <span className="num text-ink/55">{fmtK(p.prices.none)} – {fmtK(p.prices.radisson)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink/50">Package pricing is fixed by council resolution — edit via migration, not the UI.</p>
        </div>
        <div className="rounded-lg border border-flag/25 bg-flag/5 p-6">
          <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-flag uppercase"><Icon name="alert" size={14} /> Danger zone</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/65">
            Reset the demo dataset — wipes all registrations, check-ins and audit entries, then reseeds.
          </p>
          <button className="btn mt-4 h-10 border border-flag/40 text-[13px] text-flag hover:bg-flag/10" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={15} /> Reset demo data
          </button>
        </div>
      </div>
      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <div className="p-7">
            <p className="font-display text-xl font-bold text-ink">Reset all demo data?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">
              This clears registrations, attendance, users and the audit log, then restores the original seed set. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button
                className="btn bg-flag text-white hover:bg-flag/85"
                onClick={async () => {
                  await resetDemo();
                  setConfirmReset(false);
                  toast("success", "Demo data reset", "The dataset is back to its seeded state.");
                }}
              >
                <Icon name="trash" size={15} /> Yes, reset
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
