import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { issueCompanionCredentials } from "@/lib/companionConnect";
import { CompanionConnectRedirect } from "@/components/CompanionConnectRedirect";

export const metadata = {
  title: "Connect app — SplitMeta",
};

type Props = {
  searchParams: Promise<{ port?: string; state?: string }>;
};

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "https://www.splitmeta.net"
  ).replace(/\/+$/, "");
}

export default async function CompanionConnectPage({ searchParams }: Props) {
  const session = await auth();
  const { port, state } = await searchParams;

  const portNum = Number(port);
  const validPort =
    Number.isInteger(portNum) && portNum >= 1024 && portNum <= 65535;
  const validState = typeof state === "string" && /^[a-f0-9]{16,64}$/i.test(state);

  if (!session?.user) {
    const qs = new URLSearchParams();
    if (port) qs.set("port", port);
    if (state) qs.set("state", state);
    redirect(`/login?callbackUrl=${encodeURIComponent(`/companion/connect?${qs}`)}`);
  }

  if (!validPort || !validState) {
    return (
      <main className="flex-1 bg-neutral-950 text-neutral-100">
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-xl font-bold">Invalid connect request</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Open SplitMeta on your PC and sign in from the app.
          </p>
          <Link href="/download" className="mt-6 inline-block text-red-400">
            Download the app →
          </Link>
        </div>
      </main>
    );
  }

  const creds = await issueCompanionCredentials(session.user.id, siteUrl());

  const callback = new URL(`http://127.0.0.1:${portNum}/callback`);
  callback.searchParams.set("state", state!);
  callback.searchParams.set("companionToken", creds.companionToken);
  callback.searchParams.set("apiKey", creds.apiKey);
  callback.searchParams.set("email", creds.email);
  callback.searchParams.set("plan", creds.plan);
  callback.searchParams.set("name", creds.name ?? "");
  callback.searchParams.set("siteUrl", creds.siteUrl);

  const target = callback.toString();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-red-500">
          SplitMeta app
        </p>
        <h1 className="mt-3 text-2xl font-bold">Connecting your account…</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Signed in as {session.user.email}
        </p>
        <CompanionConnectRedirect target={target} />
      </div>
    </main>
  );
}
