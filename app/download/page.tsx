import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Download companion — SplitMeta",
};

const STEPS = [
  {
    title: "Download & extract",
    body: "Save the zip anywhere on your PC and unzip the folder.",
  },
  {
    title: "Get your API key",
    body: "Generate a key on your account page — you'll paste it during setup.",
    account: true,
  },
  {
    title: "Run install.bat",
    body: "Double-click install.bat, paste your sm_… key, and confirm your telemetry folder.",
  },
  {
    title: "Race with START.bat open",
    body: "Launch START.bat before you drive. After each race, uploads happen automatically.",
  },
] as const;

const REQUIREMENTS = [
  "Windows 10 or 11",
  "Node.js 18+ (nodejs.org)",
  "iRacing telemetry logging enabled",
  "SplitMeta account (you're signed in)",
] as const;

export default async function DownloadPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/download");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { uploadApiKeyPrefix: true },
  });

  const hasApiKey = Boolean(dbUser?.uploadApiKeyPrefix);

  return (
    <main className="relative flex-1 overflow-hidden bg-neutral-950 text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(220,38,38,0.18),transparent)]"
      />

      <SiteHeader />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-red-500">
            Windows companion
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Upload races while you{" "}
            <span className="text-red-500">sim</span> — zero clicks.
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            The SplitMeta companion watches your iRacing telemetry folder and
            sends setup fingerprints + results after every race session.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Signed in as {session.user.email}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-600/40 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 shadow-[0_0_60px_-12px_rgba(220,38,38,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Ready to install
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    SplitMeta Companion
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    splitmeta-companion.zip · Windows
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-950 text-2xl">
                  ⬇
                </div>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Background watcher for new .ibt files
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Auto-upload after each race
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  install.bat + START.bat included
                </li>
              </ul>

              <a
                href="/api/download/companion"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-red-500"
              >
                Download for Windows
                <span aria-hidden className="text-red-200">
                  →
                </span>
              </a>
            </div>

            <div
              className={`rounded-xl border p-5 ${
                hasApiKey
                  ? "border-emerald-800/60 bg-emerald-950/20"
                  : "border-amber-800/60 bg-amber-950/20"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  hasApiKey ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {hasApiKey ? "API key ready" : "API key needed before setup"}
              </p>
              <p className="mt-1 text-sm text-neutral-300">
                {hasApiKey ? (
                  <>
                    Your key starts with{" "}
                    <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-emerald-300">
                      {dbUser!.uploadApiKeyPrefix}…
                    </code>
                    . Paste the full key when install.bat asks.
                  </>
                ) : (
                  <>
                    Generate your upload key first — install.bat will ask for it.
                  </>
                )}
              </p>
              <Link
                href="/account"
                className="mt-3 inline-block text-sm font-medium text-red-400 hover:text-red-300"
              >
                {hasApiKey ? "Rotate key on account →" : "Generate API key →"}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur sm:p-8">
            <h2 className="text-lg font-semibold">Setup in 4 steps</h2>
            <ol className="mt-6 space-y-0">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-neutral-700"
                    />
                  )}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {"account" in step && step.account ? (
                        <>
                          {hasApiKey ? (
                            <>
                              You already have a key — or{" "}
                              <Link
                                href="/account"
                                className="text-red-400 hover:underline"
                              >
                                rotate it
                              </Link>{" "}
                              if needed.
                            </>
                          ) : (
                            <>
                              <Link
                                href="/account"
                                className="text-red-400 hover:underline"
                              >
                                Generate a key
                              </Link>{" "}
                              on your account page first.
                            </>
                          )}
                        </>
                      ) : (
                        step.body
                      )}
                    </p>
                    {step.title === "Run install.bat" && (
                      <code className="mt-2 inline-block rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-300">
                        install.bat
                      </code>
                    )}
                    {step.title === "Race with START.bat open" && (
                      <code className="mt-2 inline-block rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-300">
                        START.bat
                      </code>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="font-semibold">Requirements</h3>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              {REQUIREMENTS.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="font-semibold">What gets uploaded</h3>
            <p className="mt-3 text-sm text-neutral-400">
              Only race session metadata: series, track, finish, iRating change,
              incidents, and a hashed setup fingerprint. No raw telemetry files
              leave your PC.
            </p>
            <Link
              href="/meta"
              className="mt-4 inline-block text-sm font-medium text-red-400 hover:text-red-300"
            >
              See how data powers the meta board →
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-neutral-500">
          <Link href="/account" className="text-neutral-400 hover:text-white">
            ← Back to account
          </Link>
        </p>
      </div>
    </main>
  );
}
