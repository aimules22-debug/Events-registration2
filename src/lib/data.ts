/* ============================================================
 * ZIHRM 2026 — domain model, constants & pure helpers
 * Everything in this file is framework-free so it can be
 * unit-tested in isolation (mirrors the Laravel service layer).
 * ============================================================ */

export type Role = "organizer" | "checkin" | "reports";
export type PackageId = "p1" | "p2" | "p3";
export type AccommodationId = "none" | "radisson" | "david";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type Day = 1 | 2 | 3;

export interface FeePackage {
  id: PackageId;
  code: string;
  name: string;
  tagline: string;
  perks: string[];
  prices: Record<AccommodationId, number>;
}

export interface Accommodation {
  id: AccommodationId;
  name: string;
  short: string;
  nights: string;
  note: string;
}

export interface Bank {
  id: string;
  short: string;
  name: string;
  accountName: string;
  accountNo: string;
  branch: string;
  swift: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  password: string;
}

export interface Registration {
  id: string; // ZIHRM-2026-0431 (public registration ID)
  invoiceNo: string; // INV-2026-0431
  createdAt: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  employer: string;
  jobTitle: string;
  district: string;
  nrc: string; // raw value only ever held in-memory in this demo;
  nrcHash: string; // SHA-256 hash stored "at rest" (localStorage)
  membershipNo: string;
  memberStatus: "full" | "associate" | "non-member";
  packageId: PackageId;
  accommodationId: AccommodationId;
  total: number;
  payMethod: string;
  payRef: string;
  proof: { name: string; size: number; type: string } | null;
  paymentStatus: PaymentStatus;
}

export interface CheckIn {
  id: string;
  registrationId: string;
  day: Day;
  at: number;
  staffId: string;
  staffName: string;
}

export interface Activity {
  id: string;
  at: number;
  actor: string;
  type: "registration" | "checkin" | "payment" | "export" | "auth" | "system" | "settings";
  message: string;
}

export interface EventSettings {
  name: string;
  theme: string;
  venue: string;
  city: string;
  dates: string;
  capacity: number;
  days: { day: Day; label: string; iso: number }[];
}

/* ————— fee structure (Zambian Kwacha) ————— */

export const PACKAGES: FeePackage[] = [
  {
    id: "p1",
    code: "PKG 1",
    name: "Presidential",
    tagline: "The full convention experience",
    perks: [
      "Official convention shirt",
      "10,000 mAh power bank",
      "Smart watch",
      "Priority gala-dinner seating",
      "All keynotes & breakouts",
      "Proceedings & materials",
    ],
    prices: { none: 15000, radisson: 27500, david: 26700 },
  },
  {
    id: "p2",
    code: "PKG 2",
    name: "Executive",
    tagline: "Comfort and connectivity",
    perks: [
      "Official convention shirt",
      "10,000 mAh power bank",
      "All keynotes & breakouts",
      "Proceedings & materials",
    ],
    prices: { none: 12000, radisson: 24500, david: 23700 },
  },
  {
    id: "p3",
    code: "PKG 3",
    name: "Standard",
    tagline: "The essential delegate pass",
    perks: ["Official convention shirt", "All keynotes & breakouts", "Proceedings & materials"],
    prices: { none: 9500, radisson: 22500, david: 21200 },
  },
];

export const ACCOMMODATIONS: Accommodation[] = [
  {
    id: "none",
    name: "No accommodation",
    short: "Self-arranged",
    nights: "Day delegate",
    note: "Arrange your own stay in Livingstone — base fee only.",
  },
  {
    id: "radisson",
    name: "Radisson Blu Resort, Mosi-oa-Tunya",
    short: "Radisson Blu",
    nights: "2 nights · B&B",
    note: "Riverside resort on the Zambezi, 10 minutes from sessions.",
  },
  {
    id: "david",
    name: "David Livingstone Lodge & Spa",
    short: "David Livingstone",
    nights: "2 nights · B&B",
    note: "Safari lodge on the Zambezi with full spa and shuttle.",
  },
];

export const BANKS: Bank[] = [
  {
    id: "znbc",
    short: "ZNBC",
    name: "Zambia National Commercial Bank",
    accountName: "ZIHRM 2026 Annual Convention",
    accountNo: "1002-8841-7702",
    branch: "Cairo Road Branch, Lusaka",
    swift: "ZNCOZMLU",
  },
  {
    id: "indo",
    short: "INDO",
    name: "Indo Zambia Bank",
    accountName: "ZIHRM 2026 Annual Convention",
    accountNo: "010-4471-9023",
    branch: "Lusaka Main Branch",
    swift: "IZBLZMLU",
  },
  {
    id: "stanbic",
    short: "Stanbic",
    name: "Stanbic Bank Zambia",
    accountName: "ZIHRM 2026 Annual Convention",
    accountNo: "9100-2354-8871",
    branch: "Addis Ababa Drive, Lusaka",
    swift: "SBICZMLX",
  },
];

export const TREASURY_PHONES = ["0955 404075", "0979 480513"];

export const ROLE_META: Record<Role, { label: string; blurb: string }> = {
  organizer: { label: "Event Organizer", blurb: "Full access — registrations, payments, users, settings & reporting." },
  checkin: { label: "Check-In Staff", blurb: "Check-in desk only — participant lookup and attendance marking." },
  reports: { label: "Report Viewer", blurb: "Read-only attendance reports, analytics and Excel exports." },
};

/* ————— event dates (anchored around "now" so the demo is always live) ————— */

const DAY_MS = 86_400_000;

export function makeEventSettings(): EventSettings {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d1 = today.getTime() - DAY_MS; // convention started yesterday → Day 2 is "today"
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return {
    name: "ZIHRM 47th Annual Convention & HR Expo",
    theme: "The People Agenda — HR at the Heart of National Growth",
    venue: "Radisson Blu Resort, Mosi-oa-Tunya",
    city: "Livingstone, Zambia",
    dates: `${fmt(d1)} – ${fmt(d1 + 2 * DAY_MS)} 2026`,
    capacity: 1200,
    days: [1, 2, 3].map((day) => ({
      day: day as Day,
      label: `Day ${day} · ${fmt(d1 + (day - 1) * DAY_MS)}`,
      iso: d1 + (day - 1) * DAY_MS,
    })),
  };
}

export function currentDay(settings: EventSettings): Day {
  const now = Date.now();
  for (const d of settings.days) if (now >= d.iso && now < d.iso + DAY_MS) return d.day;
  if (now < settings.days[0].iso) return 1;
  return 3;
}

/* ————— agenda ————— */

export interface Session {
  time: string;
  title: string;
  speaker?: string;
  kind: "Keynote" | "Breakout" | "Panel" | "Social" | "Workshop";
}

export const AGENDA: { heading: string; sessions: Session[] }[] = [
  {
    heading: "Opening — The People Agenda",
    sessions: [
      { time: "08:00", title: "Registration desk & welcome coffee", kind: "Social" },
      { time: "09:30", title: "Opening keynote: Human Capital is the New Copper", speaker: "Hon. Minister of Labour", kind: "Keynote" },
      { time: "11:00", title: "ZIHRM State of the Profession Address", speaker: "ZIHRM President", kind: "Keynote" },
      { time: "14:00", title: "Breakout: Evidence-based HR analytics for Zambian firms", kind: "Breakout" },
      { time: "19:00", title: "Welcome reception — Zambezi sunset", kind: "Social" },
    ],
  },
  {
    heading: "Skills, Tech & the Future of Work",
    sessions: [
      { time: "09:00", title: "Panel: AI at work — policy, practice and the Zambian context", kind: "Panel" },
      { time: "11:00", title: "Workshop: Building a skills audit in 90 minutes", kind: "Workshop" },
      { time: "14:00", title: "Breakout: Mental health as a board-level agenda item", kind: "Breakout" },
      { time: "16:00", title: "CPD clinic — earning your credits before you leave", kind: "Workshop" },
      { time: "19:30", title: "Gala dinner & ZIHRM Excellence Awards", kind: "Social" },
    ],
  },
  {
    heading: "Closing — From Livingstone to the Workplace",
    sessions: [
      { time: "09:00", title: "Keynote: The CHRO as nation-builder", speaker: "Regional CHRO Roundtable", kind: "Keynote" },
      { time: "11:00", title: "Breakout: Labour law update — 2026 amendments explained", kind: "Breakout" },
      { time: "13:30", title: "Livingstone Declaration — delegates' communique", kind: "Panel" },
      { time: "15:00", title: "Closing ceremony & 2027 handover", kind: "Social" },
    ],
  },
];

/* ————— formatting & id helpers ————— */

export const fmtK = (n: number) => "K" + n.toLocaleString("en-GB");

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function timeAgo(t: number): string {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function nextRegistrationId(regs: Registration[]): { id: string; invoiceNo: string } {
  const max = regs.reduce((acc, r) => {
    const m = /(\d+)$/.exec(r.id);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 24);
  const num = String(max + 1).padStart(4, "0");
  return { id: `ZIHRM-2026-${num}`, invoiceNo: `INV-2026-${num}` };
}

export const NRC_RE = /^\d{6}\/\d{2}\/\d{1}$/;
export const normalizeNrc = (s: string) => s.replace(/[^\d]/g, "");

/* ————— SHA-256 hashing for NRC numbers at rest ————— */

export async function sha256(text: string): Promise<string> {
  const input = normalizeNrc(text) + "::ZIHRM26-SALT";
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    /* insecure context — fall through to FNV */
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ input.charCodeAt(i), 2246822519);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (Math.imul(h1, h2) >>> 0).toString(16).padStart(8, "0")
  );
}

/* ————— CSV (Excel) export ————— */

export function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* ————— demo seed data ————— */

type SeedRow = [
  first: string, last: string, gender: "male" | "female", employer: string, jobTitle: string,
  district: string, nrc: string, pkg: PackageId, acc: AccommodationId,
  method: string, status: PaymentStatus, days: number[], // checked-in days
];

const SEED_PEOPLE: SeedRow[] = [
  ["Mulenga", "Chanda", "female", "Zambia National Bank", "HR Officer", "Lusaka", "198704/52/1", "p2", "radisson", "ZNBC transfer", "verified", [1, 2]],
  ["Chipo", "Banda", "female", "FQM Kansanshi Mining", "HR Superintendent", "Solwezi", "199012/67/1", "p1", "david", "Stanbic transfer", "verified", [1, 2]],
  ["Bwalya", "Mulenga", "male", "ZESCO Limited", "Training Manager", "Kitwe", "198415/10/1", "p2", "none", "INDO transfer", "verified", [1]],
  ["Twaambo", "Simuwinga", "female", "Trade Kings Group", "Talent Acquisition Lead", "Lusaka", "199305/34/1", "p3", "none", "ZNBC transfer", "pending", []],
  ["Kasonde", "Mwale", "male", "Stanbic Bank Zambia", "HR Business Partner", "Lusaka", "198611/08/1", "p1", "radisson", "Stanbic transfer", "verified", [1, 2]],
  ["Natashya", "Phiri", "female", "Ministry of Health", "HR Officer", "Lusaka", "199207/41/1", "p2", "radisson", "ZNBC transfer", "verified", [1]],
  ["Mutale", "Ng'andu", "male", "Airtel Networks Zambia", "People & Culture Manager", "Lusaka", "198309/23/1", "p1", "david", "INDO transfer", "verified", [1, 2]],
  ["Chileshe", "Kapwepwe", "female", "Zanaco Plc", "Compensation Analyst", "Lusaka", "199410/19/1", "p3", "none", "ZNBC transfer", "verified", [1]],
  ["Mwenya", "Hamusonde", "male", "Copperbelt University", "Lecturer — HRM", "Ndola", "198801/71/1", "p3", "none", "INDO transfer", "pending", [1]],
  ["Lweendo", "Habanyama", "female", "Shoprite Zambia", "HR Generalist", "Lusaka", "199508/45/1", "p2", "none", "ZNBC transfer", "verified", [1, 2]],
  ["Kunda", "Tembo", "male", "Zambia Revenue Authority", "HR Officer", "Lusaka", "198712/30/1", "p2", "radisson", "Stanbic transfer", "verified", [1]],
  ["Mwansa", "Katontoka", "female", "First Quantum Minerals", "Recruitment Lead", "Kalumbila", "199102/58/1", "p1", "david", "Stanbic transfer", "verified", [1, 2]],
  ["Chilufya", "Mwaba", "male", "Zambeef Products", "HR Manager", "Lusaka", "198506/27/1", "p2", "radisson", "ZNBC transfer", "pending", []],
  ["Namakau", "Munalula", "female", "University of Zambia", "Records Officer", "Lusaka", "199603/36/1", "p3", "none", "INDO transfer", "verified", [1]],
  ["Sinkala", "Chibwe", "male", "Puma Energy Zambia", "HR Officer", "Ndola", "198912/62/1", "p3", "none", "ZNBC transfer", "verified", []],
  ["Mubita", "Liswaniso", "male", "MTN Zambia", "Talent Manager", "Lusaka", "198706/49/1", "p1", "radisson", "Stanbic transfer", "verified", [1, 2]],
  ["Kabwe", "Chishimba", "female", "Nkana Water & Sewerage", "HR Assistant", "Kitwe", "199704/15/1", "p3", "none", "ZNBC transfer", "pending", [1]],
  ["Temwani", "Gondwe", "male", "Madison General Insurance", "HR Officer", "Lusaka", "198902/77/1", "p2", "none", "INDO transfer", "verified", [1]],
  ["Bana", "Sichone", "female", "Competition & Consumer Authority", "HR Officer", "Lusaka", "199208/53/1", "p3", "radisson", "ZNBC transfer", "verified", [1, 2]],
  ["Chanda", "Mulilo", "male", "Kariba Minerals", "HR Superintendent", "Siavonga", "198410/66/1", "p2", "david", "Stanbic transfer", "verified", [1]],
  ["Miyanda", "Sakala", "female", "ZICTA", "People Operations Lead", "Lusaka", "199106/28/1", "p1", "radisson", "ZNBC transfer", "verified", [1, 2]],
  ["Chama", "Bwembya", "male", "Levy Mwanawasa Hospital", "HR Officer", "Lusaka", "198608/39/1", "p3", "none", "INDO transfer", "rejected", []],
  ["Sitali", "Muyunda", "female", "Zampost", "HR Officer", "Livingstone", "199311/21/1", "p3", "none", "ZNBC transfer", "verified", [1]],
  ["Musonda", "Katete", "female", "Copper Rose Insurance", "HR Manager", "Kitwe", "198812/57/1", "p2", "radisson", "Stanbic transfer", "verified", [1, 2]],
  ["Mwape", "Kalaba", "male", "Maamba Collieries", "HR Officer", "Sinazongwe", "199009/44/1", "p3", "none", "ZNBC transfer", "pending", []],
  ["Lombe", "Chileshe", "female", "Zambia Development Agency", "HR Officer", "Lusaka", "199404/63/1", "p2", "none", "INDO transfer", "verified", [1]],
];

export const SEED_USERS: User[] = [
  { id: "u-org", name: "Nkandu Chola", email: "events@zihrm.org.zm", role: "organizer", title: "Head of Events & Conventions", password: "demo123" },
  { id: "u-desk1", name: "Grace Zulu", email: "desk1@zihrm.org.zm", role: "checkin", title: "Front Desk — Gate A", password: "demo123" },
  { id: "u-desk2", name: "Daniel Banda", email: "desk2@zihrm.org.zm", role: "checkin", title: "Front Desk — Gate B", password: "demo123" },
  { id: "u-res", name: "Thoko Mwale", email: "research@zihrm.org.zm", role: "reports", title: "Research & Analytics", password: "demo123" },
];

/** Builds the seeded dataset with hashed NRCs and deterministic-ish timestamps. */
export async function makeSeedData(): Promise<{
  registrations: Registration[];
  checkins: CheckIn[];
  users: User[];
  activity: Activity[];
  settings: EventSettings;
}> {
  const settings = makeEventSettings();
  const now = Date.now();
  const hashes = await Promise.all(SEED_PEOPLE.map((p) => sha256(p[6])));

  const registrations: Registration[] = SEED_PEOPLE.map((p, i) => {
    const [firstName, lastName, gender, employer, jobTitle, district, nrc, packageId, accommodationId, payMethod, paymentStatus] = p;
    const num = String(i + 1).padStart(4, "0");
    const total = PACKAGES.find((k) => k.id === packageId)!.prices[accommodationId];
    return {
      id: `ZIHRM-2026-00${num.slice(1)}`,
      invoiceNo: `INV-2026-00${num.slice(1)}`,
      createdAt: now - (40 - i * 1.4) * DAY_MS - ((i * 7919) % 36000) * 1000,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@example.zm`,
      phone: `09${String(50 + i)} ${String(210 + i * 3)}${String(100 + ((i * 37) % 900))}`,
      gender,
      employer,
      jobTitle,
      district,
      nrc,
      nrcHash: hashes[i],
      membershipNo: `ZIHRM/${String(3201 + i * 7)}`,
      memberStatus: i % 6 === 4 ? "associate" : "full",
      packageId,
      accommodationId,
      total,
      payMethod,
      payRef: `PAY-${88213 + i * 97}`,
      proof: { name: `proof-${lastName.toLowerCase()}.pdf`, size: 240_000 + i * 13_500, type: "application/pdf" },
      paymentStatus,
    };
  });

  const checkins: CheckIn[] = [];
  registrations.forEach((r, i) => {
    const days = SEED_PEOPLE[i][11];
    days.forEach((d) => {
      const dayStart = settings.days[d - 1].iso;
      const at = Math.min(dayStart + 8.5 * 3_600_000 + i * 260_000 + d * 40_000, now - 120_000);
      const staff = SEED_USERS[i % 2 === 0 ? 1 : 2];
      checkins.push({
        id: `ci-${r.id}-${d}`,
        registrationId: r.id,
        day: d as Day,
        at,
        staffId: staff.id,
        staffName: staff.name,
      });
    });
  });

  const activity: Activity[] = [
    { id: "a1", at: now - 41 * DAY_MS, actor: "System", type: "system", message: "Convention registration opened to the public" },
    { id: "a2", at: now - 2 * DAY_MS - 3_600_000, actor: "Nkandu Chola", type: "payment", message: "Verified 18 proof-of-payment uploads in batch" },
    { id: "a3", at: now - DAY_MS - 2 * 3_600_000, actor: "Grace Zulu", type: "checkin", message: "Check-in desk Gate A opened for Day 1" },
    { id: "a4", at: now - 5 * 3_600_000, actor: "Thoko Mwale", type: "export", message: "Exported Day 1 attendance register (CSV)" },
  ];

  return { registrations, checkins, users: SEED_USERS, activity, settings };
}
