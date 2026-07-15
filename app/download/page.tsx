import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata = {
  title: "Download app — SplitMeta",
};

const INSTALLER_URL =
  "https://github.com/verifybloe/splitmeta/releases/latest/download/SplitMeta-Setup.exe";

const STEPS = [
  {
    title: "Download SplitMeta-Setup.exe",
    body: "One installer file — same as any normal Windows app.",
  },
  {
    title: "Run the installer",
    body: "Click through setup. SplitMeta is added to Desktop and Start Menu.",
  },
  {
    title: "Open SplitMeta & sign in",
    body: "Sign in with email/password or Google — same account as splitmeta.net. Stays signed in.",
  },
  {
    title: "Leave it running while you race",
    body: "Uploads happen automatically after each session.",
  },
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

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-red-500">
            Windows app
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            One installer.{" "}
            <span className="text-red-500">One app.</span> That&apos;s it.
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            Download SplitMeta-Setup.exe, run it, open SplitMeta from your Desktop
            — dashboard, sign-in, auto-upload. No batch files or Node.js required.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-red-600/40 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 shadow-[0_0_60px_-12px_rgba(220,38,38,0.35)]">
            <p className="text-sm font-medium text-red-400">Windows installer</p>
            <h2 className="mt-1 text-2xl font-bold">SplitMeta-Setup.exe</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Installs to your PC · Desktop + Start Menu shortcuts
            </p>

            <ul className="mt-6 space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Professional Windows installer
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Dashboard with sign-in &amp; upload status
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Remembers you between sessions
              </li>
            </ul>

            <a
              href={INSTALLER_URL}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-red-500"
            >
              Download SplitMeta-Setup.exe
              <span aria-hidden className="text-red-200">
                →
              </span>
            </a>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Install in 4 steps</h2>
            <ol className="mt-6 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-neutral-400">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
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
