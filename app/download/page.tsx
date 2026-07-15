import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Download app — SplitMeta",
};

const STEPS = [
  {
    title: "Download & extract",
    body: "Get the Windows app zip and extract it anywhere on your PC.",
  },
  {
    title: "Run install.bat",
    body: "Installs dependencies and opens SplitMeta. First launch takes a minute.",
  },
  {
    title: "Sign in with Google",
    body: "Same account as splitmeta.net — the app remembers you after that.",
  },
  {
    title: "Leave it running while you race",
    body: "Use START.bat next time. Uploads happen automatically after each race.",
  },
] as const;

const REQUIREMENTS = [
  "Windows 10 or 11",
  "Node.js 18+ (nodejs.org)",
  "iRacing telemetry logging enabled",
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
            Windows desktop app
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Dashboard, sign-in, and{" "}
            <span className="text-red-500">auto-upload</span> in one app.
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            Sign in with the same Google account as the website. Close and reopen
            — it remembers you. Watches telemetry and uploads after every race.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Signed in on the website as {session.user.email}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-600/40 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 shadow-[0_0_60px_-12px_rgba(220,38,38,0.35)]">
              <p className="text-sm font-medium text-red-400">Desktop app</p>
              <h2 className="mt-1 text-2xl font-bold">SplitMeta for Windows</h2>
              <p className="mt-1 text-sm text-neutral-400">
                splitmeta-companion.zip
              </p>

              <ul className="mt-6 space-y-2 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Dashboard with upload status &amp; activity
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Google sign-in — same account as the website
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Stays signed in when you close &amp; reopen
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
                    <p className="mt-1 text-sm text-neutral-400">{step.body}</p>
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
              Race metadata and setup fingerprints only — not raw telemetry files.
            </p>
            <Link
              href="/meta"
              className="mt-4 inline-block text-sm font-medium text-red-400 hover:text-red-300"
            >
              See the meta board →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
