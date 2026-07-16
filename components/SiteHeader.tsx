import Link from "next/link";
import { auth, signOut } from "@/auth";
import { BillingButton } from "@/components/BillingButton";

export async function SiteHeader() {
  const session = await auth();
  const isPro = session?.user?.plan === "PRO";

  return (
    <header
      className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        <Link
          href="/"
          className="font-display flex shrink-0 items-center gap-2 text-xl font-bold tracking-wide"
        >
          <img
            src="/favicon-32.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
          Split<span className="text-red-500">Meta</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm text-neutral-400">
          <Link href="/meta" className="transition hover:text-white">
            Meta
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 font-medium text-neutral-200 transition hover:text-white"
              >
                Account
                {isPro ? (
                  <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-red-400 uppercase">
                    Pro
                  </span>
                ) : null}
              </Link>
              {!isPro && (
                <BillingButton
                  label="Go Pro"
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                />
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-neutral-500 transition hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-white">
                Sign in
              </Link>
              <Link
                href="/login?callbackUrl=/account"
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Go Pro — $8/mo
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
