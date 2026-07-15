import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildPostRaceBriefing, getUserRecentRaces } from "@/lib/metaCompute";
import { iratingToBand, shortFingerprint } from "@/lib/ingest";
import { BillingButton } from "@/components/BillingButton";
import { PostRaceBriefingCard } from "@/components/PostRaceBriefingCard";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { RaceTrends } from "@/components/RaceTrends";
import { listMetaAlerts, listWatchlist } from "@/lib/watchlist";
import { getUserTrends } from "@/lib/trends";

export const metadata = {
  title: "Account — SplitMeta",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ checkout?: string }>;
};

function formatLap(ms: number) {
  if (!ms || ms <= 0) return "—";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export default async function AccountPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const { checkout } = await searchParams;
  const isPro = session.user.plan === "PRO";
  const races = await getUserRecentRaces(session.user.id, 15);
  const latest = races[0] ?? null;

  let briefing = null;
  if (latest) {
    try {
      briefing = await buildPostRaceBriefing({
        plan: isPro ? "PRO" : "FREE",
        seriesWeekId: latest.seriesWeekId,
        fingerprintShort: shortFingerprint(latest.setup.fingerprint),
        iratingBefore: latest.iratingBefore,
        finishPos: latest.finishPos,
        fieldSize: latest.fieldSize,
      });
    } catch {
      briefing = null;
    }
  }

  const bandHref = latest
    ? `/meta?band=${iratingToBand(latest.iratingBefore)}`
    : "/meta";

  const [watchItems, watchAlerts, trends] = await Promise.all([
    isPro ? listWatchlist(session.user.id) : Promise.resolve([]),
    isPro ? listMetaAlerts(session.user.id, { limit: 30 }) : Promise.resolve([]),
    getUserTrends(session.user.id, 20),
  ]);

  return (
    <main className="flex-1 bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-neutral-400">{session.user.email}</p>

        {checkout === "success" && (
          <p className="mt-4 rounded-md border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            Payment received. If Pro isn&apos;t showing yet, refresh in a few
            seconds while Stripe webhooks sync.
          </p>
        )}
        {checkout === "canceled" && (
          <p className="mt-4 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
            Checkout canceled. You can upgrade anytime.
          </p>
        )}

        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-500">Current plan</p>
          <p className="mt-1 text-xl font-semibold">
            {isPro ? (
              <span className="text-red-400">Pro — $8/mo</span>
            ) : (
              "Free"
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isPro ? (
              <BillingButton
                mode="portal"
                label="Manage billing"
                className="rounded-md border border-neutral-600 px-4 py-2 font-medium text-neutral-200 hover:border-neutral-400"
              />
            ) : (
              <BillingButton
                label="Upgrade to Pro — $8/mo"
                className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
              />
            )}
            <Link
              href="/meta"
              className="rounded-md border border-neutral-700 px-4 py-2 font-medium text-neutral-300 hover:border-neutral-500"
            >
              Open meta board
            </Link>
          </div>
        </div>

        {briefing ? (
          <div className="mt-8">
            <PostRaceBriefingCard briefing={briefing} bandHref={bandHref} />
          </div>
        ) : null}

        <div className="mt-8">
          <RaceTrends trends={trends} isPro={isPro} />
        </div>

        {isPro ? (
          <WatchlistPanel items={watchItems} alerts={watchAlerts} />
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 px-6 py-4">
            <p className="text-sm text-neutral-500">Your race uploads</p>
            <p className="mt-0.5 font-semibold text-neutral-100">
              Live from the database — no demo data
            </p>
          </div>
          <div className="px-6 py-4">
            {races.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-neutral-400">
                  No races uploaded yet. Run the SplitMeta app, click Start
                  watching, and finish a race with telemetry enabled.
                </p>
                <Link
                  href="/download"
                  className="mt-4 inline-block text-sm font-medium text-red-400 hover:text-red-300"
                >
                  Download app →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {races.map((race) => {
                  const trackName = race.seriesWeek.track.config
                    ? `${race.seriesWeek.track.name} — ${race.seriesWeek.track.config}`
                    : race.seriesWeek.track.name;
                  const irDelta = race.iratingAfter - race.iratingBefore;
                  const irLabel =
                    irDelta === 0
                      ? "iR ±0"
                      : `iR ${irDelta > 0 ? "+" : ""}${irDelta}`;
                  return (
                    <li key={race.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {race.seriesWeek.series.name}
                          </p>
                          <p className="mt-0.5 text-sm text-neutral-400">
                            {race.setup.car.name} · {trackName}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            Week {race.seriesWeek.weekNum} ·{" "}
                            {new Date(race.racedAt).toLocaleString()} · setup{" "}
                            {shortFingerprint(race.setup.fingerprint)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">
                            P{race.finishPos}
                            <span className="font-normal text-neutral-500">
                              /{race.fieldSize}
                            </span>
                          </p>
                          <p className="text-neutral-400">
                            {formatLap(race.bestLapMs)} · {race.incidents}x ·{" "}
                            {irLabel}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950">
          <div className="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4">
            <p className="text-sm text-neutral-500">Windows companion</p>
            <p className="mt-0.5 font-semibold text-neutral-100">
              Auto-upload race results
            </p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-neutral-400">
              Download{" "}
              <strong className="text-neutral-300">SplitMeta-Setup.exe</strong>,
              run it once, then open SplitMeta from your Desktop.
            </p>
            <Link
              href="/download"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-500"
            >
              Download app
              <span aria-hidden className="text-red-200">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
