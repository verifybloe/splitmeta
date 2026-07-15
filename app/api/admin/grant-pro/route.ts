import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/password";

export const runtime = "nodejs";

/**
 * One-time / ops helper: grant complimentary Pro.
 * POST { "email": "user@example.com" }
 * Header: x-admin-secret: ADMIN_GRANT_SECRET
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_GRANT_SECRET;
  const provided = req.headers.get("x-admin-secret");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, plan: true },
  });

  // Comp Pro only — never elevates to any admin role (there isn't one).
  // Creates the user shell if they haven't signed up yet so Google/email
  // login with this address picks up PRO immediately.
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          plan: "PRO",
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: new Date("2099-12-31T00:00:00.000Z"),
        },
        select: {
          id: true,
          email: true,
          plan: true,
          stripeCurrentPeriodEnd: true,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          plan: "PRO",
          stripeCurrentPeriodEnd: new Date("2099-12-31T00:00:00.000Z"),
        },
        select: {
          id: true,
          email: true,
          plan: true,
          stripeCurrentPeriodEnd: true,
        },
      });

  return NextResponse.json({
    ok: true,
    created: !existing,
    user,
  });
}
