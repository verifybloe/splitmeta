import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { BillingButton } from "@/components/BillingButton";
import { UploadKeyPanel } from "@/components/UploadKeyPanel";

export const metadata = {
  title: "Account — SplitMeta",
};

type Props = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function AccountPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const { checkout } = await searchParams;
  const isPro = session.user.plan === "PRO";

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { uploadApiKeyPrefix: true },
  });

  return (
    <main className="flex-1 bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-12">
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

        <UploadKeyPanel prefix={dbUser?.uploadApiKeyPrefix ?? null} />
      </div>
    </main>
  );
}
