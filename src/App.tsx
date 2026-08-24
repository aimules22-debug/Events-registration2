/* ============================================================
 * ZIHRM 2026 — application shell
 * Routing, role-gated portals, sticky header, footer, toasts.
 * ============================================================ */

import { useEffect } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { ROLE_META } from "./lib/data";
import { FlagStripe, Icon, Logo, ToastHost } from "./components/ui";
import Public from "./views/Public";
import Register from "./views/Register";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import CheckIn from "./views/CheckIn";
import Reports from "./views/Reports";

const NAV = [
  { label: "Programme", id: "programme" },
  { label: "Fees", id: "packages" },
  { label: "Hotels", id: "stay" },
  { label: "Payments", id: "payments" },
];

function Shell() {
  const { ready, route, navigate, session, logout, toasts, dismissToast, toast } = useStore();

  useEffect(() => {
    document.title =
      route.view === "app" && session
        ? `ZIHRM 2026 · ${ROLE_META[session.role].label} Portal`
        : "ZIHRM 2026 — Annual Convention & HR Expo · Registration";
  }, [route.view, session]);

  const goSection = (id: string) => {
    if (route.view !== "home") navigate("home");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-pine-950">
        <div className="animate-pulse"><Logo dark size={52} /></div>
        <p className="flex items-center gap-2.5 font-mono text-[11.5px] tracking-[0.22em] text-paper/50 uppercase">
          <Icon name="refresh" size={14} className="spin" /> Preparing convention data
        </p>
      </div>
    );
  }

  const inPortal = route.view === "app" && !!session;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ————— header ————— */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5">
          <button onClick={() => navigate("home")} className="cursor-pointer transition hover:opacity-80" aria-label="ZIHRM 2026 home">
            <Logo />
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => goSection(n.id)}
                className="cursor-pointer rounded-md px-3.5 py-2 text-[13.5px] font-medium text-ink/60 transition hover:bg-ink/5 hover:text-ink"
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {session ? (
              <>
                {!inPortal && (
                  <button className="btn-pine h-10 px-4 text-[13px]" onClick={() => navigate("app")}>
                    <Icon name="shield" size={15} /> Portal
                  </button>
                )}
                <span className={`chip hidden sm:inline-flex ${session.role === "organizer" ? "border-pine-700/30 bg-pine-100 text-pine-800" : session.role === "checkin" ? "border-copper-500/40 bg-copper-100 text-copper-700" : "border-ink/15 text-ink/55"}`}>
                  {ROLE_META[session.role].label}
                </span>
                <button
                  className="btn-ghost h-10 px-3.5 text-[13px]"
                  onClick={() => { logout(); toast("info", "Signed out", "Your staff session has ended."); }}
                >
                  <Icon name="logout" size={15} /> <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost h-10 px-4 text-[13px]" onClick={() => navigate("login")}>
                  <Icon name="shield" size={15} /> Staff portal
                </button>
                {route.view !== "register" && (
                  <button className="btn-copper h-10 px-4 text-[13px]" onClick={() => navigate("register")}>
                    Register <Icon name="arrowRight" size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* ————— routed view ————— */}
      <main className="flex-1">
        {route.view === "home" && <Public />}
        {route.view === "register" && <Register key={route.presetPackage ?? "none"} />}
        {route.view === "login" && (session ? <PortalGate /> : <Login />)}
        {route.view === "app" && <PortalGate />}
      </main>

      {/* ————— footer ————— */}
      <footer className="relative overflow-hidden bg-pine-950 text-paper">
        <div className="bg-chitenge-light absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <Logo dark size={36} />
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-paper/55">
                The Zambia Institute of Human Resource Management is the statutory professional body for the
                people profession — convening practitioners since 1979.
              </p>
              <FlagStripe className="mt-5 w-32" />
            </div>
            <div>
              <p className="font-mono text-[10.5px] font-semibold tracking-[0.22em] text-copper-300 uppercase">Convention</p>
              <ul className="mt-4 space-y-2.5 text-[13px] text-paper/65">
                {NAV.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => goSection(n.id)} className="cursor-pointer transition hover:text-copper-300">{n.label}</button>
                  </li>
                ))}
                <li><button onClick={() => navigate("register")} className="cursor-pointer text-copper-300 transition hover:text-copper-400">Register a delegate →</button></li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10.5px] font-semibold tracking-[0.22em] text-copper-300 uppercase">Contact</p>
              <ul className="mt-4 space-y-2.5 text-[13px] text-paper/65">
                <li className="flex items-center gap-2.5"><Icon name="phone" size={14} className="text-copper-400" /> 0955 404075 · 0979 480513</li>
                <li className="flex items-center gap-2.5"><Icon name="mail" size={14} className="text-copper-400" /> convention@zihrm.org.zm</li>
                <li className="flex items-center gap-2.5"><Icon name="pin" size={14} className="text-copper-400" /> Plot 2259, Kabotobo Rd, Lusaka</li>
                <li className="flex items-center gap-2.5"><Icon name="shield" size={14} className="text-copper-400" />
                  <button onClick={() => navigate("login")} className="cursor-pointer transition hover:text-copper-300">Staff portal sign-in</button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-6">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-paper/35 uppercase">© 2026 ZIHRM · Registration, attendance & reporting platform</p>
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-paper/35 uppercase">NRCs stored as SHA-256 hashes · POPIA-aligned</p>
          </div>
        </div>
      </footer>

      <ToastHost toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

/** Role-based portal gate — the RBAC surface of the app. */
function PortalGate() {
  const { session } = useStore();
  if (!session) return <Login />;
  if (session.role === "organizer") return <Dashboard />;
  if (session.role === "checkin") return <CheckIn />;
  return <Reports />;
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
