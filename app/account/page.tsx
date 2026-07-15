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
  title: "My account — SplitMeta",
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
  const displayName =
    session.user.name?.split(" ")[0] ||
    session.user.email?.split("@")[0] ||
    "Driver";

  const races = await getUserRecentRaces(session.user.id, 20);
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
    isPro
      ? listMetaAlerts(session.user.id, { limit: 30 })
      : Promise.resolve([]),
    getUserTrends(session.user.id, 20),
  ]);

  const unreadAlerts = watchAlerts.filter((a) => !a.readAt).length;

  return (
    <main className="relative flex-1 overflow-hidden bg-neutral-950 text-neutral-100">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 10% -10%, rgba(220,38,38,0.18), transparent 50%),
            radial-gradient(ellipse 50% 40% at 100% 0%, rgba(220,38,38,0.08), transparent 45%),
            #0a0a0a
          `,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-red-500 uppercase">
              My account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hey {displayName}
            </h1>
            <p className="mt-2 text-neutral-400">{session.user.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isPro
                  ? "bg-red-600/20 text-red-400"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {isPro ? "Pro" : "Free"}
            </span>
            {isPro ? (
              <BillingButton
                mode="portal"
                label="Manage billing"
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:border-neutral-500"
              />
            ) : (
              <BillingButton
                label="Upgrade to Pro — $8/mo"
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
              />
            )}
          </div>
        </div>

        {checkout === "success" && (
          <p className="mt-6 rounded-md border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            Payment received. If Pro isn&apos;t showing yet, refresh in a few
            seconds while Stripe webhooks sync.
          </p>
        )}
        {checkout === "canceled" && (
          <p className="mt-6 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
            Checkout canceled. You can upgrade anytime.
          </p>
        )}

        {/* Jump links */}
        <nav className="mt-8 flex flex-wrap gap-2 text-sm">
          {[
            { href: "#trends", label: "Trends" },
            { href: "#races", label: "Race history" },
            ...(isPro
              ? [
                  {
                    href: "#watchlist",
                    label:
                      unreadAlerts > 0
                        ? `Watchlist (${unreadAlerts})`
                        : "Watchlist",
                  },
                ]
              : []),
            { href: "#app", label: "Companion app" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/meta"
            className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
          >
            Meta board →
          </Link>
        </nav>

        {briefing ? (
          <div className="mt-8">
            <PostRaceBriefingCard briefing={briefing} bandHref={bandHref} />
          </div>
        ) : null}

        <section id="trends" className="mt-10 scroll-mt-24">
          <RaceTrends trends={trends} isPro={isPro} />
        </section>

        <section id="races" className="mt-10 scroll-mt-24">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/90">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800 px-6 py-5">
              <div>
                <p className="text-sm text-neutral-500">Race history</p>
                <h2 className="mt-0.5 text-lg font-semibold text-neutral-100">
                  Your uploads
                </h2>
              </div>
              <p className="text-sm text-neutral-500">
                {races.length} race{races.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="px-6 py-4">
              {races.length === 0 ? (
                <div className="py-8 text-center">
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
                      <li key={race.id} className="py-4 first:pt-2 last:pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
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
                            <p className="text-lg font-semibold">
                              P{race.finishPos}
                              <span className="text-base font-normal text-neutral-500">
                                /{race.fieldSize}
                              </span>
                            </p>
                            <p className="text-neutral-400">
                              {formatLap(race.bestLapMs)} · {race.incidents}x ·{" "}
                              <span
                                className={
                                  irDelta > 0
                                    ? "text-emerald-400"
                                    : irDelta < 0
                                      ? "text-red-400"
                                      : ""
                                }
                              >
                                {irLabel}
                              </span>
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
        </section>

        {isPro ? (
          <section id="watchlist" className="scroll-mt-24">
            <WatchlistPanel items={watchItems} alerts={watchAlerts} />
          </section>
        ) : null}

        <section id="app" className="mt-10 scroll-mt-24 pb-8">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950">
            <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
              <div className="border-b border-neutral-800 px-6 py-6 md:border-b-0 md:border-r md:py-8 md:pl-8">
                <p className="text-sm font-medium tracking-wide text-red-500 uppercase">
                  Companion
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Keep the app running while you race
                </h2>
                <p className="mt-3 max-w-md text-sm text-neutral-400">
                  Downloads{" "}
                  <strong className="text-neutral-300">
                    SplitMeta-Setup.exe
                  </strong>
                  , signs in with the same account, and uploads results for
                  trends + meta.
                </p>
                <Link
                  href="/download"
                  className="mt-6 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-500"
                >
                  Download app
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="flex flex-col justify-center gap-3 px-6 py-6 text-sm text-neutral-400 md:px-8">
                <p>
                  <span className="text-neutral-200">1.</span> Install once
                </p>
                <p>
                  <span className="text-neutral-200">2.</span> Sign in + Auto on
                </p>
                <p>
                  <span className="text-neutral-200">3.</span> Race — trends
                  update here
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
