import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Sign in — SplitMeta",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const next = callbackUrl || "/account";
  const isDownload = next.includes("/download");

  if (session?.user) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 flex-col bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold">
            {isDownload ? (
              <>
                Sign in to download the{" "}
                <span className="text-red-500">companion</span>
              </>
            ) : (
              <>
                Sign in to Split<span className="text-red-500">Meta</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {isDownload
              ? "Use Google to verify your account, then grab the Windows uploader."
              : "Use Google to create your account. Upgrade anytime for $8/mo."}
          </p>
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: next });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-neutral-900 hover:bg-neutral-200"
            >
              Continue with Google
            </button>
          </form>
          {isDownload && (
            <p className="mt-4 text-xs text-neutral-500">
              Free to download · contributes data to your iRating band
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
