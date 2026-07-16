import { NextResponse } from "next/server";
import { authenticateCompanionRequest } from "@/lib/companionAuth";
import { listMetaAlerts, markAlertsRead } from "@/lib/watchlist";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authenticateCompanionRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.plan !== "PRO") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const alerts = await listMetaAlerts(user.id, {
    unreadOnly,
    limit: unreadOnly ? 10 : 20,
  });

  return NextResponse.json({ ok: true, alerts });
}

export async function POST(req: Request) {
  const user = await authenticateCompanionRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.plan !== "PRO") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  let body: { action?: string; alertIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "mark-read") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await markAlertsRead(user.id, body.alertIds);
  return NextResponse.json({ ok: true });
}
