import Link from "next/link";
import { auth, signOut } from "@/auth";
import { BillingButton } from "@/components/BillingButton";

export async function SiteHeader() {
  const session = await auth();
  const isPro = session?.user?.plan === "PRO";

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Split<span className="text-red-500">Meta</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-400">
          <Link href="/meta" className="hover:text-white">
            Meta board
          </Link>
          {session?.user ? (
            <>
              <Link href="/account" className="hover:text-white">
                {isPro ? (
                  <span className="rounded bg-red-600/20 px-2 py-0.5 text-red-400">
                    Pro
                  </span>
                ) : (
                  "Account"
                )}
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
