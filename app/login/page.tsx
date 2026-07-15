import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "@/components/LoginForm";

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
                <span className="text-red-500">app</span>
              </>
            ) : (
              <>
                Sign in to Split<span className="text-red-500">Meta</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Email &amp; password or Google — same account everywhere.
          </p>
          <LoginForm callbackUrl={next} />
        </div>
      </div>
    </main>
  );
}
