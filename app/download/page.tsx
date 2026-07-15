import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Download companion — SplitMeta",
};

const STEPS = [
  {
    title: "Download & extract",
    body: "One zip — your account is already linked inside. Extract anywhere on your PC.",
  },
  {
    title: "Run install.bat",
    body: "Double-click install.bat. It connects your account and installs dependencies. Confirm your telemetry folder.",
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
            Download, install,{" "}
            <span className="text-red-500">race</span> — it handles the rest.
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            Sign in on the website, download the zip, run install.bat once. Your
            account connects automatically — no API keys to copy.
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
                    Connected to your account
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
                  Account linked automatically on download
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Background watcher for new .ibt files
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Auto-upload after each race
                </li>
              </ul>

              <a
                href="/api/download/companion"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-red-500"
              >
                Download &amp; connect
                <span aria-hidden className="text-red-200">
                  →
                </span>
              </a>
              <p className="mt-3 text-center text-xs text-neutral-500">
                Re-download anytime to reconnect this PC
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <p className="text-sm font-medium text-neutral-300">
                Already installed?
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Download again to refresh your account link, then run install.bat
                in the extracted folder.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur sm:p-8">
            <h2 className="text-lg font-semibold">Setup in 3 steps</h2>
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
                    <p className="mt-1 text-sm text-neutral-400">{step.body}</p>
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
