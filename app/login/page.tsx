import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";

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

  if (session?.user) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <h1 className="text-2xl font-bold">
          Sign in to Split<span className="text-red-500">Meta</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Use Google to create your account. Upgrade anytime for $8/mo.
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
            className="w-full rounded-md bg-white px-4 py-3 font-semibold text-neutral-900 hover:bg-neutral-200"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
