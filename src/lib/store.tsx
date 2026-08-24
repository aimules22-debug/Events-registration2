/* ============================================================
 * ZIHRM 2026 — application store
 * Client-side stand-in for the Laravel backend: persists to
 * localStorage, enforces role-based access in the UI shell,
 * and exposes typed actions (register / check-in / payments /
 * users / settings) with an activity audit trail.
 * ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  makeSeedData,
  nextRegistrationId,
  normalizeNrc,
  sha256,
  PACKAGES,
  type Activity,
  type CheckIn,
  type Day,
  type EventSettings,
  type PackageId,
  type PaymentStatus,
  type Registration,
  type Role,
  type User,
} from "./data";

const DATA_KEY = "zihrm2026.data.v1";
const SESSION_KEY = "zihrm2026.session.v1";

export type View = "home" | "register" | "login" | "app";

export interface Route {
  view: View;
  presetPackage?: PackageId | null;
}

export interface Toast {
  id: number;
  kind: "success" | "error" | "info" | "warning";
  title: string;
  msg?: string;
}

export interface NewRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  employer: string;
  jobTitle: string;
  district: string;
  nrc: string;
  membershipNo: string;
  memberStatus: Registration["memberStatus"];
  packageId: PackageId;
  accommodationId: Registration["accommodationId"];
  payMethod: string;
  payRef: string;
  proof: Registration["proof"];
}

interface StoreShape {
  ready: boolean;
  route: Route;
  navigate: (view: View, presetPackage?: PackageId | null) => void;

  session: User | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAs: (userId: string) => void;
  logout: () => void;

  registrations: Registration[];
  checkins: CheckIn[];
  users: User[];
  activity: Activity[];
  settings: EventSettings;
  toasts: Toast[];

  toast: (kind: Toast["kind"], title: string, msg?: string) => void;
  dismissToast: (id: number) => void;

  findDuplicate: (nrc: string, membershipNo: string) => Registration | null;
  register: (input: NewRegistration) => Promise<{ ok: true; reg: Registration } | { ok: false; dup?: Registration; error?: string }>;
  setPaymentStatus: (regId: string, status: PaymentStatus) => void;
  checkIn: (regId: string, day: Day) => { ok: boolean; error?: string; record?: CheckIn };
  setRole: (userId: string, role: Role) => void;
  addUser: (name: string, email: string, role: Role) => void;
  updateSettings: (patch: Partial<EventSettings>) => void;
  resetDemo: () => Promise<void>;
  logExport: (what: string) => void;
}

const Ctx = createContext<StoreShape | null>(null);

interface Persisted {
  registrations: Registration[];
  checkins: CheckIn[];
  users: User[];
  activity: Activity[];
  settings: EventSettings;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

let toastSeq = 1;
let actSeq = 100;

export function StoreProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(loadPersisted, []);
  const [ready, setReady] = useState(!!persisted);
  const [registrations, setRegistrations] = useState<Registration[]>(persisted?.registrations ?? []);
  const [checkins, setCheckins] = useState<CheckIn[]>(persisted?.checkins ?? []);
  const [users, setUsers] = useState<User[]>(persisted?.users ?? []);
  const [activity, setActivity] = useState<Activity[]>(persisted?.activity ?? []);
  const [settings, setSettings] = useState<EventSettings>(persisted?.settings ?? null!);
  const [session, setSession] = useState<User | null>(() => {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id || !persisted) return null;
      return persisted.users.find((u) => u.id === id) ?? null;
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState<Route>({ view: "home" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  /* Boot: seed the database on first run (hashing NRCs is async). */
  useEffect(() => {
    let alive = true;
    if (!persisted) {
      makeSeedData().then((seed) => {
        if (!alive) return;
        setRegistrations(seed.registrations);
        setCheckins(seed.checkins);
        setUsers(seed.users);
        setActivity(seed.activity);
        setSettings(seed.settings);
        setReady(true);
      });
    }
    return () => {
      alive = false;
    };
  }, [persisted]);

  /* Persist every slice of state. */
  useEffect(() => {
    if (!ready) return;
    const data: Persisted = { registrations, checkins, users, activity, settings };
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      /* storage full — non-fatal in demo */
    }
  }, [ready, registrations, checkins, users, activity, settings]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (kind: Toast["kind"], title: string, msg?: string) => {
      const id = toastSeq++;
      setToasts((t) => [...t.slice(-3), { id, kind, title, msg }]);
      timers.current.push(window.setTimeout(() => dismissToast(id), 5200));
    },
    [dismissToast],
  );

  const navigate = useCallback((view: View, presetPackage: PackageId | null = null) => {
    setRoute({ view, presetPackage });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const log = useCallback((actor: string, type: Activity["type"], message: string) => {
    setActivity((a) => [{ id: `a${actSeq++}`, at: Date.now(), actor, type, message }, ...a].slice(0, 120));
  }, []);

  /* ————— auth ————— */

  const login = useCallback(
    (email: string, password: string) => {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { ok: false, error: "No staff account found for that email." };
      if (user.password !== password) return { ok: false, error: "Incorrect password — demo accounts use “demo123”." };
      setSession(user);
      localStorage.setItem(SESSION_KEY, user.id);
      log(user.name, "auth", "Signed in to the staff portal");
      setRoute({ view: "app" });
      return { ok: true };
    },
    [users, log],
  );

  const loginAs = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      setSession(user);
      localStorage.setItem(SESSION_KEY, user.id);
      log(user.name, "auth", "Signed in to the staff portal");
      setRoute({ view: "app" });
    },
    [users, log],
  );

  const logout = useCallback(() => {
    if (session) log(session.name, "auth", "Signed out");
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    setRoute({ view: "home" });
  }, [session, log]);

  /* ————— duplicate detection ————— */

  const findDuplicate = useCallback(
    (nrc: string, membershipNo: string) => {
      const nrcDigits = normalizeNrc(nrc);
      const mem = membershipNo.trim().toUpperCase();
      return (
        registrations.find(
          (r) =>
            (nrcDigits.length >= 6 && normalizeNrc(r.nrc) === nrcDigits) ||
            (mem.length >= 4 && r.membershipNo.toUpperCase() === mem),
        ) ?? null
      );
    },
    [registrations],
  );

  /* ————— registration ————— */

  const register = useCallback(
    async (input: NewRegistration) => {
      const hash = await sha256(input.nrc);
      const dup =
        registrations.find((r) => r.nrcHash === hash || r.nrc === input.nrc) ??
        registrations.find((r) => r.membershipNo.toUpperCase() === input.membershipNo.trim().toUpperCase()) ??
        null;
      if (dup) return { ok: false as const, dup };

      const pkg = PACKAGES.find((p) => p.id === input.packageId)!;
      const total = pkg.prices[input.accommodationId];
      const { id, invoiceNo } = nextRegistrationId(registrations);
      const reg: Registration = {
        ...input,
        id,
        invoiceNo,
        createdAt: Date.now(),
        nrcHash: hash,
        total,
        paymentStatus: "pending",
      };
      setRegistrations((r) => [reg, ...r]);
      log("Public portal", "registration", `New registration ${id} — ${reg.firstName} ${reg.lastName} (${pkg.name})`);
      return { ok: true as const, reg };
    },
    [registrations, log],
  );

  const setPaymentStatus = useCallback(
    (regId: string, status: PaymentStatus) => {
      const reg = registrations.find((r) => r.id === regId);
      setRegistrations((rs) => rs.map((r) => (r.id === regId ? { ...r, paymentStatus: status } : r)));
      if (reg && session) log(session.name, "payment", `Marked ${regId} payment as ${status}`);
    },
    [registrations, session, log],
  );

  /* ————— check-in ————— */

  const checkIn = useCallback(
    (regId: string, day: Day) => {
      if (!session) return { ok: false, error: "No staff session." };
      if (session.role !== "checkin" && session.role !== "organizer")
        return { ok: false, error: "Your role cannot mark attendance." };
      const exists = checkins.find((c) => c.registrationId === regId && c.day === day);
      if (exists) return { ok: false, error: "Already checked in for this day." };
      const reg = registrations.find((r) => r.id === regId);
      if (!reg) return { ok: false, error: "Registration not found." };
      const record: CheckIn = {
        id: `ci-${regId}-${day}-${Date.now()}`,
        registrationId: regId,
        day,
        at: Date.now(),
        staffId: session.id,
        staffName: session.name,
      };
      setCheckins((c) => [record, ...c]);
      log(session.name, "checkin", `Checked in ${reg.firstName} ${reg.lastName} (${regId}) — Day ${day}`);
      return { ok: true, record };
    },
    [session, checkins, registrations, log],
  );

  /* ————— users & settings ————— */

  const setRole = useCallback(
    (userId: string, role: Role) => {
      setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role } : u)));
      const target = users.find((u) => u.id === userId);
      if (target && session) log(session.name, "settings", `Changed ${target.name}'s role to ${role}`);
      if (session?.id === userId) setSession((s) => (s ? { ...s, role } : s));
    },
    [users, session, log],
  );

  const addUser = useCallback(
    (name: string, email: string, role: Role) => {
      const user: User = {
        id: `u-${Date.now()}`,
        name,
        email,
        role,
        title: "Convention staff",
        password: "demo123",
      };
      setUsers((us) => [...us, user]);
      if (session) log(session.name, "settings", `Added staff account for ${name} (${role})`);
    },
    [session, log],
  );

  const updateSettings = useCallback(
    (patch: Partial<EventSettings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      if (session) log(session.name, "settings", "Updated event configuration");
    },
    [session, log],
  );

  const logExport = useCallback(
    (what: string) => {
      if (session) log(session.name, "export", `Exported ${what} to Excel (CSV)`);
    },
    [session, log],
  );

  const resetDemo = useCallback(async () => {
    const seed = await makeSeedData();
    setRegistrations(seed.registrations);
    setCheckins(seed.checkins);
    setUsers(seed.users);
    setActivity(seed.activity);
    setSettings(seed.settings);
    log("System", "system", "Demo dataset was reset to seed state");
  }, [log]);

  const value: StoreShape = {
    ready,
    route,
    navigate,
    session,
    login,
    loginAs,
    logout,
    registrations,
    checkins,
    users,
    activity,
    settings,
    toasts,
    toast,
    dismissToast,
    findDuplicate,
    register,
    setPaymentStatus,
    checkIn,
    setRole,
    addUser,
    updateSettings,
    resetDemo,
    logExport,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreShape {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
