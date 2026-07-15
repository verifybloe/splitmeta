// Shared types + helpers. MOCK data is only used on the public landing page
// when there is no live WeeklyMeta yet (marketing preview).

export type MetaEntry = {
  rank: number;
  setupLabel: string;
  fingerprint: string;
  score: number; // 0-100 composite
  sampleRaces: number;
  paceDeltaMs: number; // best lap vs band median (negative = faster)
  topFiveRate: number; // 0-1
  avgIncidents: number;
  keyDeltas: string[]; // human-readable "what this setup runs differently"
};

export type WeeklyMetaView = {
  series: string;
  car: string;
  track: string;
  seasonLabel: string;
  weekNum: number;
  band: string;
  bandLabel: string;
  computedAt: string;
  /** Present on live boards — used for Pro setup detail lookups. */
  seriesWeekId?: string;
  entries: MetaEntry[];
};

export const RATING_BANDS = [
  { id: "ROOKIE_0_1350", label: "0 – 1350 iR" },
  { id: "D_1350_2000", label: "1350 – 2000 iR" },
  { id: "C_2000_2700", label: "2000 – 2700 iR" },
  { id: "B_2700_3500", label: "2700 – 3500 iR" },
  { id: "A_3500_PLUS", label: "3500+ iR" },
] as const;

export const MOCK_WEEKLY_META: WeeklyMetaView = {
  series: "GT3 Fixed — Falken Tyre Sports Car Challenge",
  car: "Ferrari 296 GT3",
  track: "Circuit de Spa-Francorchamps — Grand Prix",
  seasonLabel: "2026 Season 3",
  weekNum: 4,
  band: "C_2000_2700",
  bandLabel: "2000 – 2700 iR",
  computedAt: "2026-07-14T06:00:00Z",
  entries: [
    {
      rank: 1,
      setupLabel: "Low-wing stability build",
      fingerprint: "a3f9c1",
      score: 91,
      sampleRaces: 148,
      paceDeltaMs: -412,
      topFiveRate: 0.61,
      avgIncidents: 2.1,
      keyDeltas: [
        "-2 rear wing vs band average",
        "+0.4 psi LF / RF cold pressure",
        "Softer front ARB for Eau Rouge compression",
      ],
    },
    {
      rank: 2,
      setupLabel: "High-downforce rain-safe",
      fingerprint: "7be204",
      score: 84,
      sampleRaces: 96,
      paceDeltaMs: -287,
      topFiveRate: 0.54,
      avgIncidents: 1.8,
      keyDeltas: [
        "+3 rear wing vs band average",
        "Higher brake bias (56.2%)",
        "Stiffer rear springs for curb stability",
      ],
    },
    {
      rank: 3,
      setupLabel: "Aggressive quali-pace",
      fingerprint: "d84e77",
      score: 79,
      sampleRaces: 63,
      paceDeltaMs: -498,
      topFiveRate: 0.48,
      avgIncidents: 3.4,
      keyDeltas: [
        "Minimum fuel + offset ballast",
        "-0.6 deg front camber",
        "Fastest single-lap pace, higher incident rate",
      ],
    },
    {
      rank: 4,
      setupLabel: "Baseline+ (iRacing fixed tweak)",
      fingerprint: "22c9b0",
      score: 71,
      sampleRaces: 201,
      paceDeltaMs: -103,
      topFiveRate: 0.39,
      avgIncidents: 2.3,
      keyDeltas: ["Near-default garage settings", "Most common setup in band"],
    },
    {
      rank: 5,
      setupLabel: "Tyre-saver long stint",
      fingerprint: "f01a5d",
      score: 66,
      sampleRaces: 44,
      paceDeltaMs: -51,
      topFiveRate: 0.35,
      avgIncidents: 1.5,
      keyDeltas: [
        "Lowest pressures in band",
        "Best final-5-lap pace retention",
        "Lowest incident rate in band",
      ],
    },
  ],
};

export function formatPaceDelta(ms: number): string {
  const sign = ms <= 0 ? "-" : "+";
  const abs = Math.abs(ms);
  return `${sign}${(abs / 1000).toFixed(3)}s`;
}
