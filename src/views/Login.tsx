/* ============================================================
 * Staff sign-in — persona quick-login plus email/password form.
 * Demonstrates the three RBAC roles: organizer / check-in /
 * report viewer.
 * ============================================================ */

import { useState } from "react";
import { ROLE_META, type Role } from "../lib/data";
import { useStore } from "../lib/store";
import { FlagStripe, Icon, Logo, type IconName } from "../components/ui";

const ROLE_ICONS: Record<Role, IconName> = { organizer: "shield", checkin: "clipboard", reports: "chart" };

export default function Login() {
  const { users, login, loginAs, navigate, toast } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(email, password);
    if (!res.ok) {
      setErr(res.error ?? "Sign-in failed.");
      return;
    }
    setErr("");
    toast("success", "Welcome back", "You are signed in to the staff portal.");
  };

  return (
    <div className="bg-chitenge grid min-h-[82vh] lg:grid-cols-[0.9fr_1.1fr]">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-pine-950 text-paper lg:block">
        <div className="bg-chitenge-light absolute inset-0" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-copper-500/15 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo dark size={38} />
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-copper-300 uppercase">Staff portal</p>
            <h2 className="mt-3 font-display text-[38px] leading-[1.05] font-extrabold tracking-tight">
              Three roles.<br />One source of truth.
            </h2>
            <ul className="mt-7 space-y-4">
              {(["organizer", "checkin", "reports"] as Role[]).map((r) => (
                <li key={r} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-pine-800 text-copper-300">
                    <Icon name={ROLE_ICONS[r]} size={17} />
                  </span>
                  <div>
                    <p className="font-display text-[15.5px] font-bold">{ROLE_META[r].label}</p>
                    <p className="mt-0.5 max-w-xs text-[12.5px] leading-relaxed text-paper/60">{ROLE_META[r].blurb}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <FlagStripe className="w-28" />
            <p className="mt-3 font-mono text-[10.5px] tracking-[0.18em] text-paper/40 uppercase">Zambia Institute of Human Resource Management</p>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <button onClick={() => navigate("home")} className="mb-6 inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-ink/50 uppercase transition hover:text-ink">
            <Icon name="arrowLeft" size={13} /> Back to convention site
          </button>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Staff sign-in</h1>
          <p className="mt-2 text-[14px] text-ink/60">Pick a demo persona or use credentials — every account uses password <span className="num rounded bg-mist px-1.5 py-0.5 font-semibold text-ink">demo123</span>.</p>

          <div className="mt-7 space-y-3">
            {users.slice(0, 4).map((u, i) => (
              <button
                key={u.id}
                onClick={() => { loginAs(u.id); toast("success", `Signed in as ${u.name}`, ROLE_META[u.role].label); }}
                className="group card fade-up flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-pine-700/40 hover:shadow-lg"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-900 font-display text-[13px] font-bold text-copper-300">
                  {u.name.split(" ").map((p) => p[0]).join("").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{u.name}</span>
                  <span className="block truncate text-[12px] text-ink/50">{u.email} · {u.title}</span>
                </span>
                <span className={`chip shrink-0 ${u.role === "organizer" ? "border-pine-700/30 bg-pine-100 text-pine-800" : u.role === "checkin" ? "border-copper-500/40 bg-copper-100 text-copper-700" : "border-ink/15 text-ink/55"}`}>
                  {ROLE_META[u.role].label}
                </span>
                <Icon name="arrowRight" size={16} className="shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-copper-600" />
              </button>
            ))}
          </div>

          <div className="my-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-ink/12" />
            <span className="font-mono text-[10.5px] tracking-[0.2em] text-ink/40 uppercase">or with credentials</span>
            <span className="h-px flex-1 bg-ink/12" />
          </div>

          <form onSubmit={submit} className="card space-y-4 p-6">
            <div>
              <label className="label">Email</label>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="events@zihrm.org.zm" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {err && (
              <p className="fade-up flex items-center gap-2 rounded-md border border-flag/30 bg-flag/8 px-3.5 py-2.5 text-[12.5px] font-medium text-flag">
                <Icon name="alert" size={14} /> {err}
              </p>
            )}
            <button type="submit" className="btn-copper w-full">Sign in <Icon name="arrowRight" size={16} /></button>
            <p className="text-center text-[11.5px] text-ink/45">Demo hint: events@zihrm.org.zm · desk1@zihrm.org.zm · research@zihrm.org.zm</p>
          </form>
        </div>
      </div>
    </div>
  );
}
