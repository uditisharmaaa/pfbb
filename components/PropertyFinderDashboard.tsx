"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bus,
  Car,
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquare,
  Route,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

type AgentKey = "finance" | "reddit" | "routing" | "negotiator";

type RedditQuote = { tag: "PRO" | "CON" | "NEUTRAL"; text: string };

type PropertyProfile = {
  id: string;
  title: string;
  area: string;
  city: string;
  beds: string;
  priceAED: number;
  image: string;
  tagline: string;
  bestMatch?: boolean;
  finance: {
    asking: number;
    trueValue: number;
    undervaluedPct: number;
    netYield: number;
    dldAverageYield: number;
  };
  reddit: RedditQuote[];
  routing: {
    work: { mins: number; mode: "car" | "bus" | "walk" };
    school: { mins: number; mode: "car" | "bus" | "walk" };
    gym: { mins: number; mode: "car" | "bus" | "walk" };
  };
  negotiator: { offerAED: number; pitch: string };
};

const AGENTS: Array<{
  key: AgentKey;
  label: string;
  short: string;
  icon: ReactNode;
  color: string;
}> = [
  { key: "finance", label: "Finance", short: "DLD valuation", icon: <TrendingUp className="h-4 w-4" />, color: "text-[#d9b45d]" },
  { key: "reddit", label: "Vibe Check", short: "Reddit scrape", icon: <MessageSquare className="h-4 w-4" />, color: "text-[#97c9b7]" },
  { key: "routing", label: "Commute", short: "Route matrix", icon: <Route className="h-4 w-4" />, color: "text-[#7eb8ff]" },
  { key: "negotiator", label: "Sniper", short: "Broker pitch", icon: <Target className="h-4 w-4" />, color: "text-[#f0a8c0]" },
];

const MOCK_PROPERTIES: PropertyProfile[] = [
  {
    id: "reem-bridge-2br",
    title: "Reem Bridge View 2BR",
    area: "Al Reem Island",
    city: "Abu Dhabi",
    beds: "2 bed",
    priceAED: 2100000,
    bestMatch: true,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
    tagline: "Sweet spot between Hub71 and school runs.",
    finance: { asking: 2100000, trueValue: 2168000, undervaluedPct: 3.1, netYield: 6.9, dldAverageYield: 6.4 },
    reddit: [
      { tag: "PRO", text: "Best balance if one parent works in ADGM and kids are on Reem/Khalifa school routes." },
      { tag: "PRO", text: "Building gym is actually maintained — rare for Reem towers." },
      { tag: "CON", text: "Visitor parking after 7pm is painful." },
    ],
    routing: { work: { mins: 8, mode: "car" }, school: { mins: 14, mode: "bus" }, gym: { mins: 4, mode: "walk" } },
    negotiator: {
      offerAED: 2010000,
      pitch:
        "We're submitting AED 2.01M — DLD supports a fair spread, but we're discounting for the parking complaints surfacing on r/dubaihomes. Flexible move-in.",
    },
  },
  {
    id: "saadiyat-grove-1br",
    title: "Saadiyat Grove 1BR",
    area: "Saadiyat Island",
    city: "Abu Dhabi",
    beds: "1 bed",
    priceAED: 1450000,
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
    tagline: "Culture district calm, museum walkable.",
    finance: { asking: 1450000, trueValue: 1512000, undervaluedPct: 4.2, netYield: 7.8, dldAverageYield: 6.1 },
    reddit: [
      { tag: "PRO", text: "Walking paths and grove community feel alive on weekends." },
      { tag: "CON", text: "Chiller fees are highway robbery — budget extra in July." },
      { tag: "CON", text: "Saadiyat exit ramp backup at school drop-off." },
    ],
    routing: { work: { mins: 22, mode: "car" }, school: { mins: 14, mode: "bus" }, gym: { mins: 6, mode: "walk" } },
    negotiator: {
      offerAED: 1385000,
      pitch: "AED 1.385M offer factoring chiller premiums and exit delays flagged in community threads. 21-day close.",
    },
  },
  {
    id: "marina-gate-studio",
    title: "Marina Gate Studio",
    area: "Dubai Marina",
    city: "Dubai",
    beds: "Studio",
    priceAED: 980000,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    tagline: "Waterfront studio, strong short-let demand.",
    finance: { asking: 980000, trueValue: 1015000, undervaluedPct: 3.6, netYield: 8.4, dldAverageYield: 7.2 },
    reddit: [
      { tag: "PRO", text: "Views are insane and Marina Walk is downstairs." },
      { tag: "CON", text: "Elevator delays during peak — multiple threads confirm." },
      { tag: "CON", text: "Service charges jumped 11% last year." },
    ],
    routing: { work: { mins: 28, mode: "car" }, school: { mins: 19, mode: "car" }, gym: { mins: 3, mode: "walk" } },
    negotiator: {
      offerAED: 935000,
      pitch: "AED 935K based on DLD undervaluation minus elevator downtime and rising service charges. Sign this week.",
    },
  },
  {
    id: "downtown-burj-3br",
    title: "Burj District 3BR",
    area: "Downtown Dubai",
    city: "Dubai",
    beds: "3 bed",
    priceAED: 4200000,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
    tagline: "Trophy skyline asset, high liquidity.",
    finance: { asking: 4200000, trueValue: 4090000, undervaluedPct: -2.6, netYield: 5.4, dldAverageYield: 5.8 },
    reddit: [
      { tag: "PRO", text: "Burj views hold resale liquidity like nothing else." },
      { tag: "CON", text: "Tourist traffic makes Thursday grocery runs painful." },
      { tag: "CON", text: "Overpriced vs DLD unless you get a real corner unit." },
    ],
    routing: { work: { mins: 35, mode: "car" }, school: { mins: 24, mode: "car" }, gym: { mins: 7, mode: "walk" } },
    negotiator: {
      offerAED: 3920000,
      pitch: "AED 3.92M — ask sits above DLD model plus tourist congestion premium. Cash-ready if seller moves.",
    },
  },
];

const SWARM_SCRIPT: Array<{ delay: number; log: string; unlock?: AgentKey }> = [
  { delay: 0, log: "Locking property context…" },
  { delay: 400, log: "Finance Agent → pulling DLD comps" },
  { delay: 900, log: "Valuation ready", unlock: "finance" },
  { delay: 1300, log: "Sentiment Agent → scraping r/dubai + r/dubaihomes" },
  { delay: 1800, log: "Raw community quotes parsed", unlock: "reddit" },
  { delay: 2200, log: "Routing Agent → peak-hour matrix to Work · School · Gym" },
  { delay: 2700, log: "Commute grid complete", unlock: "routing" },
  { delay: 3100, log: "Negotiator → synthesizing sniper pitch" },
  { delay: 3600, log: "Offer armed — awaiting deploy", unlock: "negotiator" },
  { delay: 4000, log: "Swarm complete ✓" },
];

function formatAED(value: number) {
  return `AED ${value.toLocaleString("en-AE")}`;
}

function commuteScore(property: PropertyProfile) {
  const total = property.routing.work.mins + property.routing.school.mins + property.routing.gym.mins;
  return Math.max(55, Math.min(99, 100 - Math.round(total * 0.85)));
}

function ModeIcon({ mode }: { mins: number; mode: "car" | "bus" | "walk" }) {
  const Icon = mode === "car" ? Car : mode === "bus" ? Bus : Footprints;
  return <Icon className="h-3.5 w-3.5 opacity-70" />;
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.4}s`,
        color: ["#d9b45d", "#97c9b7", "#f4eee4", "#c66b3d", "#7eb8ff"][i % 5],
      })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="dash-confetti absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}

export default function PropertyFinderDashboard({
  initialLifestyle = "",
  autoRunBestMatch = false,
}: {
  initialLifestyle?: string;
  autoRunBestMatch?: boolean;
}) {
  const [work, setWork] = useState("Hub71");
  const [school, setSchool] = useState("ACS");
  const [gym, setGym] = useState("F45");
  const [lifestyle, setLifestyle] = useState(initialLifestyle);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<Record<AgentKey, boolean>>({
    finance: false,
    reddit: false,
    routing: false,
    negotiator: false,
  });
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const swarmRunRef = useRef(0);

  const property = useMemo(
    () => MOCK_PROPERTIES.find((p) => p.id === selectedId) ?? null,
    [selectedId],
  );

  const unlockedCount = Object.values(unlocked).filter(Boolean).length;
  const progress = running ? Math.min(95, 12 + unlockedCount * 22) : deployed ? 100 : started ? 8 : 0;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const runSwarm = useCallback(
    (p: PropertyProfile) => {
      clearTimers();
      const runId = ++swarmRunRef.current;

      setStarted(true);
      setRunning(true);
      setDeployed(false);
      setConfetti(false);
      setUnlocked({ finance: false, reddit: false, routing: false, negotiator: false });
      setLogs([`Analyzing ${p.title}…`]);

      window.requestAnimationFrame(() => {
        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      SWARM_SCRIPT.forEach((step) => {
        const t = window.setTimeout(() => {
          if (runId !== swarmRunRef.current) return;
          setLogs((cur) => [...cur, step.log]);
          if (step.unlock) setUnlocked((cur) => ({ ...cur, [step.unlock!]: true }));
          if (step.log.includes("complete")) setRunning(false);
        }, step.delay);
        timers.current.push(t);
      });
    },
    [clearTimers],
  );

  const selectProperty = useCallback(
    (id: string) => {
      const p = MOCK_PROPERTIES.find((x) => x.id === id);
      if (!p) return;
      setSelectedId(id);
      runSwarm(p);
    },
    [runSwarm],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!autoRunBestMatch) return;
    const best = MOCK_PROPERTIES.find((p) => p.bestMatch) ?? MOCK_PROPERTIES[0];
    const timer = window.setTimeout(() => selectProperty(best.id), 350);
    return () => window.clearTimeout(timer);
  }, [autoRunBestMatch, selectProperty]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const deploy = () => {
    setDeployed(true);
    setConfetti(true);
    setLogs((cur) => [...cur, "Sniper offer sent to broker ✓"]);
    window.setTimeout(() => setConfetti(false), 2200);
  };

  const finance = property?.finance;

  return (
    <div className="dashboard-shell min-h-screen">
      <Confetti active={confetti} />

      <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-8 md:py-8">
        {/* Hero */}
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-[#d9b45d]">
              <Sparkles className="h-3.5 w-3.5" />
              Live demo
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#f4eee4] md:text-5xl">
              Property Finder,
              <span className="block bg-gradient-to-r from-[#d9b45d] to-[#97c9b7] bg-clip-text text-transparent">
                But Better
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-base text-[#f4eee4]/55">
              Set your life anchors, pick a home, watch four AI agents negotiate for you.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {["Profile", "Pick home", "Agent swarm", "Deploy offer"].map((step, i) => {
              const active =
                (i === 0) ||
                (i === 1 && selectedId) ||
                (i === 2 && started) ||
                (i === 3 && deployed);
              const done =
                (i === 0) ||
                (i === 1 && selectedId) ||
                (i === 2 && unlockedCount === 4) ||
                (i === 3 && deployed);
              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                    active ? "border-[#d9b45d]/40 bg-[#d9b45d]/10 text-[#f4eee4]" : "border-white/10 text-white/35"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? "bg-[#97c9b7] text-[#08090c]" : active ? "bg-[#d9b45d] text-[#08090c]" : "bg-white/10"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {step}
                </div>
              );
            })}
          </div>
        </header>

        {/* Profile strip */}
        <section className="glass-panel mb-6 overflow-hidden rounded-3xl p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f4eee4]/70">
              Step 1 · Your life map
            </h2>
            <span className="text-xs text-[#f4eee4]/40">Agents use these for commute math</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Work", icon: MapPin, value: work, set: setWork, ph: "Hub71" },
              { label: "School", icon: GraduationCap, value: school, set: setSchool, ph: "ACS" },
              { label: "Gym", icon: Dumbbell, value: gym, set: setGym, ph: "F45" },
            ].map(({ label, icon: Icon, value, set, ph }) => (
              <label key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#f4eee4]/45">
                  <Icon className="h-3.5 w-3.5 text-[#d9b45d]" />
                  {label}
                </span>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  className="w-full bg-transparent text-sm font-medium text-[#f4eee4] outline-none placeholder:text-white/25"
                />
              </label>
            ))}
            <label className="rounded-2xl border border-[#d9b45d]/25 bg-[#d9b45d]/[0.06] px-4 py-3 md:col-span-1">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#d9b45d]/80">
                <Search className="h-3.5 w-3.5" />
                Vibe
              </span>
              <input
                value={lifestyle}
                onChange={(e) => setLifestyle(e.target.value)}
                placeholder="Quiet, walkable, no chiller shock…"
                className="w-full bg-transparent text-sm text-[#f4eee4] outline-none placeholder:text-white/30"
              />
            </label>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* Properties — below workspace on mobile once started */}
          <aside className={started ? "order-2 lg:order-1" : "order-1"}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f4eee4]/70">
                Step 2 · Pick a home
              </h2>
              <span className="text-xs text-[#f4eee4]/40">Tap to run swarm</span>
            </div>
            <div className="space-y-3">
              {MOCK_PROPERTIES.map((p) => {
                const active = p.id === selectedId;
                const score = commuteScore(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProperty(p.id)}
                    className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 active:scale-[0.98] ${
                      active
                        ? "border-[#d9b45d]/50 ring-2 ring-[#d9b45d]/40 shadow-[0_0_0_1px_rgba(217,180,93,0.3),0_24px_60px_rgba(0,0,0,0.45)]"
                        : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    {p.bestMatch ? (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-[#d9b45d] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#08090c]">
                        Best match
                      </span>
                    ) : null}
                    <div className="relative h-36">
                      <img src={p.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/20 to-transparent" />
                      <div className="absolute bottom-3 right-3 flex h-12 w-12 flex-col items-center justify-center rounded-full border border-[#97c9b7]/40 bg-[#08090c]/80 backdrop-blur">
                        <span className="text-sm font-bold text-[#97c9b7]">{score}</span>
                        <span className="text-[8px] uppercase text-white/50">fit</span>
                      </div>
                    </div>
                    <div className="border-t border-white/8 bg-[#0c0d10]/90 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#f4eee4]">
                            {p.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#f4eee4]/50">
                            {p.beds} · {p.area}
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 shrink-0 transition ${active ? "text-[#d9b45d]" : "text-white/20 group-hover:text-white/50"}`}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#d9b45d]">{formatAED(p.priceAED)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Workspace — jumps above property list on mobile after first click */}
          <section
            ref={workspaceRef}
            id="agent-workspace"
            className={`min-h-[680px] scroll-mt-6 ${started ? "order-1 lg:order-2" : "order-2"}`}
          >
            {!started ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-8 text-center lg:min-h-[520px]">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d9b45d]/30 bg-[#d9b45d]/10">
                  <Sparkles className="h-8 w-8 text-[#d9b45d]" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#f4eee4]">
                  Tap a home on the left
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#f4eee4]/50">
                  The agent swarm runs here — valuation, Reddit vibe check, commute matrix, and your sniper
                  offer.
                </p>
                <button
                  type="button"
                  onClick={() => selectProperty(MOCK_PROPERTIES[0].id)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#d9b45d] px-6 py-3 text-sm font-semibold text-[#08090c] transition hover:bg-[#e8c872] active:scale-95"
                >
                  Try best match
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {running ? (
                  <div className="rounded-2xl border border-[#97c9b7]/30 bg-[#97c9b7]/10 px-4 py-3 text-center text-sm font-medium text-[#97c9b7] lg:hidden">
                    Swarm running — agents unlocking below ↓
                  </div>
                ) : null}
                {/* Active property + pipeline */}
                {property ? (
                  <div className="glass-panel dash-scan relative overflow-hidden rounded-3xl p-5">
                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-[#f4eee4]/45">Analyzing</p>
                        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#f4eee4]">
                          {property.title}
                        </h3>
                        <p className="text-sm text-[#f4eee4]/50">
                          {property.area} · {formatAED(property.priceAED)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {running ? (
                          <span className="flex items-center gap-2 text-sm text-[#97c9b7]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Swarm running
                          </span>
                        ) : deployed ? (
                          <span className="rounded-full bg-[#97c9b7]/20 px-3 py-1 text-sm font-medium text-[#97c9b7]">
                            Offer deployed
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#d9b45d]/20 px-3 py-1 text-sm font-medium text-[#d9b45d]">
                            Ready to deploy
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 mt-5">
                      <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-[#f4eee4]/40">
                        <span>Agent pipeline</span>
                        <span>{unlockedCount}/4 unlocked</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#d9b45d] to-[#97c9b7] transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {AGENTS.map((agent) => {
                          const on = unlocked[agent.key];
                          return (
                            <div
                              key={agent.key}
                              className={`rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                                on
                                  ? "border-[#d9b45d]/30 bg-[#d9b45d]/[0.08]"
                                  : running
                                    ? "border-white/8 bg-white/[0.02]"
                                    : "border-white/8 bg-transparent opacity-50"
                              }`}
                            >
                              <div className={`flex items-center gap-2 ${agent.color}`}>
                                {agent.icon}
                                <span className="text-xs font-semibold text-[#f4eee4]">{agent.label}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-[#f4eee4]/40">{on ? "Ready" : agent.short}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Terminal */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050608]">
                  <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c66b3d]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d9b45d]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#97c9b7]/80" />
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-[11px] text-[#97c9b7]/80">
                      orchestrator.log
                    </span>
                  </div>
                  <div
                    ref={logRef}
                    className="fine-scrollbar max-h-[120px] overflow-y-auto px-4 py-3 font-[family-name:var(--font-mono)] text-[11px] leading-6 text-[#97c9b7]/90"
                  >
                    {logs.map((line, i) => (
                      <div key={`${line}-${i}`}>
                        <span className="text-[#d9b45d]/60">{String(i + 1).padStart(2, "0")}</span> {line}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  <AgentCard
                    agent={AGENTS[0]}
                    unlocked={unlocked.finance}
                    running={running}
                  >
                    {finance ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Stat label="Asking" value={formatAED(finance.asking)} />
                          <Stat label="True value" value={formatAED(finance.trueValue)} />
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#f4eee4]/55">vs market</span>
                            <span className={finance.undervaluedPct >= 0 ? "text-[#97c9b7]" : "text-[#c66b3d]"}>
                              {finance.undervaluedPct >= 0 ? "Undervalued" : "Overpriced"}{" "}
                              {Math.abs(finance.undervaluedPct).toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/8">
                            <div
                              className={`h-full rounded-full ${finance.undervaluedPct >= 0 ? "bg-[#97c9b7]" : "bg-[#c66b3d]"}`}
                              style={{ width: `${Math.min(100, Math.abs(finance.undervaluedPct) * 12 + 30)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-[#f4eee4]/55">Net yield</span>
                            <span className="font-semibold">{finance.netYield}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-[#d9b45d]"
                              style={{ width: `${Math.min(100, (finance.netYield / finance.dldAverageYield) * 45)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-[#f4eee4]/40">DLD avg {finance.dldAverageYield}%</p>
                        </div>
                      </div>
                    ) : null}
                  </AgentCard>

                  <AgentCard agent={AGENTS[1]} unlocked={unlocked.reddit} running={running}>
                    <div className="space-y-2">
                      {property?.reddit.map((q, i) => (
                        <div key={i} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              q.tag === "PRO" ? "text-[#97c9b7]" : q.tag === "CON" ? "text-[#c66b3d]" : "text-[#d9b45d]"
                            }`}
                          >
                            {q.tag}
                          </span>
                          <p className="mt-1 text-sm leading-snug text-[#f4eee4]/75">&ldquo;{q.text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </AgentCard>

                  <AgentCard agent={AGENTS[2]} unlocked={unlocked.routing} running={running}>
                    <div className="space-y-2">
                      {property
                        ? ([
                            { label: work || "Work", data: property.routing.work },
                            { label: school || "School", data: property.routing.school },
                            { label: gym || "Gym", data: property.routing.gym },
                          ] as const).map(({ label, data }) => (
                            <div
                              key={label}
                              className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-3"
                            >
                              <div className="flex items-center gap-2 text-sm text-[#f4eee4]/80">
                                <ModeIcon mode={data.mode} mins={data.mins} />
                                {label}
                              </div>
                              <span className="font-[family-name:var(--font-mono)] text-sm text-[#97c9b7]">
                                {data.mins} min
                              </span>
                            </div>
                          ))
                        : null}
                    </div>
                  </AgentCard>

                  <AgentCard agent={AGENTS[3]} unlocked={unlocked.negotiator} running={running} highlight>
                    {property ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-[#d9b45d]/20 bg-[#d9b45d]/[0.06] p-4">
                          <p className="text-[11px] uppercase tracking-wider text-[#d9b45d]/80">Sniper offer</p>
                          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[#f4eee4]">
                            {formatAED(property.negotiator.offerAED)}
                          </p>
                        </div>
                        <p className="rounded-xl border border-white/8 bg-black/25 p-3 text-sm leading-relaxed text-[#f4eee4]/75">
                          {property.negotiator.pitch}
                        </p>
                        <button
                          type="button"
                          onClick={deploy}
                          disabled={deployed}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition ${
                            deployed
                              ? "bg-[#97c9b7]/20 text-[#97c9b7]"
                              : "dash-glow bg-gradient-to-r from-[#d9b45d] to-[#e8c872] text-[#08090c] hover:brightness-110"
                          }`}
                        >
                          <Zap className="h-4 w-4" />
                          {deployed ? "Offer sent to broker" : "Deploy sniper offer"}
                        </button>
                      </div>
                    ) : null}
                  </AgentCard>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  unlocked,
  running,
  highlight,
  children,
}: {
  agent: (typeof AGENTS)[number];
  unlocked: boolean;
  running: boolean;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-500 ${
        unlocked
          ? `dash-rise ${highlight ? "border-[#d9b45d]/30 bg-[#d9b45d]/[0.04]" : "border-white/12 bg-[#0a0b0e]/80"}`
          : "border-white/8 bg-[#08090c]/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={agent.color}>{agent.icon}</span>
          <div>
            <p className="text-sm font-semibold text-[#f4eee4]">{agent.label}</p>
            <p className="text-[10px] text-[#f4eee4]/40">{agent.short}</p>
          </div>
        </div>
        {unlocked ? (
          <Check className="h-4 w-4 text-[#97c9b7]" />
        ) : running ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#f4eee4]/30" />
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-[#f4eee4]/25">Locked</span>
        )}
      </div>
      {unlocked ? (
        children
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/8 text-xs text-[#f4eee4]/30">
          Waiting for orchestrator…
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[#f4eee4]/40">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#f4eee4]">{value}</p>
    </div>
  );
}
