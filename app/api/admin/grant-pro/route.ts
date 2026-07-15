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

  if (!existing) {
    return NextResponse.json(
      { error: `No user found for ${email}` },
      { status: 404 },
    );
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      plan: "PRO",
      // Comp: no Stripe sub so cancel webhooks won't flip them back.
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
  });

  return NextResponse.json({ ok: true, user });
}
