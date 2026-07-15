import Link from "next/link";
import { formatPaceDelta } from "@/lib/mockMeta";
import { getLatestMetaBoard, getUserWeekPulse } from "@/lib/metaCompute";
import { auth } from "@/auth";
import { BillingButton } from "@/components/BillingButton";
import { YourWeekHero } from "@/components/YourWeekHero";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const isPro = session?.user?.plan === "PRO";
  const downloadHref = isLoggedIn
    ? "/download"
    : "/login?callbackUrl=/download";

  const pulse =
    isLoggedIn && session?.user?.id
      ? await getUserWeekPulse(
          session.user.id,
          session.user.plan === "PRO" ? "PRO" : "FREE",
        )
      : null;

  // Marketing preview only when logged out and no live DB rankings yet.
  const { meta, source } = await getLatestMetaBoard(
    pulse?.board?.band,
    { allowMock: !isLoggedIn },
  );
  const isLive = source === "live";
  const isPreview = source === "mock";
  const topThree = meta.entries.slice(0, 3);
  const showBoard = topThree.length > 0;

  return (
    <main className="flex-1 bg-neutral-950 text-neutral-100">
      {pulse ? (
        <YourWeekHero
          pulse={pulse}
          isPro={isPro}
          name={session?.user?.name}
        />
      ) : (
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-red-500">
            For iRacing drivers
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Know what&apos;s actually fast in{" "}
            <span className="text-red-500">your split</span> — this week.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            Pro setups are built for aliens. SplitMeta ranks the setups real
            drivers in your iRating band are winning with — per series, per week,
            from crowd-sourced race results.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/meta"
              className="rounded-md bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
            >
              See this week&apos;s meta
            </Link>
            <Link
              href={downloadHref}
              className="rounded-md border border-neutral-700 px-6 py-3 font-semibold text-neutral-300 hover:border-neutral-500"
            >
              Download companion
            </Link>
            <a
              href="#how"
              className="rounded-md border border-neutral-700 px-6 py-3 font-semibold text-neutral-300 hover:border-neutral-500"
            >
              How it works
            </a>
          </div>
        </section>
      )}

      {!pulse ? (
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            {showBoard ? (
              <>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    This week&apos;s top 3 —{" "}
                    {isLive ? "live" : "example preview"}
                  </h2>
                  <span className="text-sm text-neutral-500">
                    {meta.series} · Week {meta.weekNum} · {meta.bandLabel}
                  </span>
                </div>
                {isPreview && (
                  <p className="mb-4 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500">
                    Example data for the landing page. Sign in and upload races to
                    see live rankings for your band.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  {topThree.map((entry) => (
                    <div
                      key={entry.fingerprint}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-2xl font-bold text-red-500">
                          #{entry.rank}
                        </span>
                        <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                          score {entry.score}
                        </span>
                      </div>
                      <p className="font-medium">{entry.setupLabel}</p>
                      <dl className="mt-3 space-y-1 text-sm text-neutral-400">
                        <div className="flex justify-between">
                          <dt>Pace vs band</dt>
                          <dd className="text-emerald-400">
                            {formatPaceDelta(entry.paceDeltaMs)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Top-5 rate</dt>
                          <dd>{Math.round(entry.topFiveRate * 100)}%</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Races sampled</dt>
                          <dd>{entry.sampleRaces}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                  Full rankings, setup parameter deltas, and post-race briefing are
                  Pro features.{" "}
                  <Link href="/meta" className="text-red-400 hover:underline">
                    Open the meta board →
                  </Link>
                </p>
              </>
            ) : (
              <div className="py-6 text-center">
                <h2 className="text-lg font-semibold">No live meta yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                  Upload races with the SplitMeta app and rankings will show up
                  here from real driver data — not demos.
                </p>
                <Link
                  href={downloadHref}
                  className="mt-5 inline-block rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  Get the app
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {!pulse ? (
        <>
          <section id="how" className="border-t border-neutral-800 bg-neutral-900">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
              <div className="grid gap-8 sm:grid-cols-3">
                {[
                  {
                    step: "1",
                    title: "Race like normal",
                    body: "Download the companion, run it in the background, and race. After each session it uploads your setup fingerprint and result — zero clicks.",
                    link: downloadHref,
                    linkLabel: "Get the companion",
                  },
                  {
                    step: "2",
                    title: "We crunch the crowd",
                    body: "Every night, results are grouped by identical setups and ranked per series week and iRating band: pace, finishes, incidents, sample size.",
                  },
                  {
                    step: "3",
                    title: "Run the meta",
                    body: "Open your band's board, see what's winning and why, and copy the winning deltas into your garage. Built for your split, not for aliens.",
                  },
                ].map((item) => (
                  <div key={item.step}>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold">
                      {item.step}
                    </div>
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm text-neutral-400">{item.body}</p>
                    {"link" in item && item.link && (
                      <Link
                        href={item.link}
                        className="mt-3 inline-block text-sm font-medium text-red-400 hover:text-red-300"
                      >
                        {item.linkLabel} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="download"
            className="border-t border-neutral-800 bg-neutral-900/50"
          >
            <div className="mx-auto max-w-5xl px-6 py-16">
              <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                <div className="grid lg:grid-cols-2">
                  <div className="border-b border-neutral-800 p-8 lg:border-b-0 lg:border-r lg:p-10">
                    <p className="text-sm font-medium uppercase tracking-widest text-red-500">
                      Free for all drivers
                    </p>
                    <h2 className="mt-3 text-3xl font-bold">
                      Windows companion app
                    </h2>
                    <p className="mt-4 text-neutral-400">
                      Watches your iRacing telemetry folder and uploads race results
                      in the background. Download the desktop app, sign in with
                      Google — same account, remembered on your PC.
                    </p>
                    <ul className="mt-6 space-y-2 text-sm text-neutral-300">
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        Auto-upload after every race
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        Pro post-race briefing after every session
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        Helps build meta for your iRating band
                      </li>
                    </ul>
                    <Link
                      href={downloadHref}
                      className="mt-8 inline-flex rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
                    >
                      {isLoggedIn ? "Download app" : "Sign in to download"}
                    </Link>
                  </div>
                  <div className="flex flex-col justify-center bg-neutral-950 p-8 lg:p-10">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 font-mono text-sm">
                      <p className="text-neutral-500">// after each race</p>
                      <p className="mt-2 text-emerald-400">
                        ✓ Uploaded → setup #2 in your band
                      </p>
                      <p className="mt-1 text-neutral-400">
                        pace vs band · deltas · sample size
                      </p>
                      <p className="mt-4 text-neutral-500">// come back next week</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="pricing" className="border-t border-neutral-800">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <h2 className="mb-10 text-center text-2xl font-bold">Pricing</h2>
              <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                  <h3 className="text-lg font-semibold">Free</h3>
                  <p className="mt-1 text-3xl font-bold">$0</p>
                  <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                    <li>Weekly top-3 teaser per series</li>
                    <li>Contribute your data, help your band</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-red-600 bg-neutral-900 p-6">
                  <h3 className="text-lg font-semibold text-red-400">Pro</h3>
                  <p className="mt-1 text-3xl font-bold">
                    $8
                    <span className="text-base font-normal text-neutral-400">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                    <li>Full ranked meta board for your band</li>
                    <li>Setup parameter deltas</li>
                    <li>View / download full parameter sheets</li>
                    <li>Watchlist + meta-moved alerts</li>
                    <li>Personal finish / iR trend charts</li>
                    <li>Post-race briefing in the app</li>
                    <li>Personal history &amp; your-week home</li>
                  </ul>
                  <div className="mt-6">
                    <BillingButton
                      label="Get Pro"
                      className="w-full rounded-md bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <footer className="border-t border-neutral-800 py-6 text-center text-sm text-neutral-600">
        SplitMeta — crowd-sourced setup meta for iRacing. Not affiliated with
        iRacing.com Motorsport Simulations.
      </footer>
    </main>
  );
}
