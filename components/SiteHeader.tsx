import Link from "next/link";
import { auth, signOut } from "@/auth";
import { BillingButton } from "@/components/BillingButton";

export async function SiteHeader() {
  const session = await auth();
  const isPro = session?.user?.plan === "PRO";

  return (
    <header
      className="border-b border-neutral-800"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
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
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-neutral-400">
          <Link href="/meta" className="hover:text-white">
            Meta board
          </Link>
          {session?.user ? (
            <>
              <Link href="/download" className="hover:text-white">
                Download
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 font-medium text-neutral-200 hover:text-white"
              >
                My account
                {isPro ? (
                  <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                    Pro
                  </span>
                ) : null}
              </Link>
              {!isPro && <BillingButton />}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
              <Link
                href="/login?callbackUrl=/download"
                className="hover:text-white"
              >
                Download
              </Link>
              <Link
                href="/login?callbackUrl=/account"
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500"
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
