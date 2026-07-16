import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/password";
import { secretsEqual } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Ops-only: grant or revoke complimentary Pro.
 * POST { "email": "...", "action"?: "revoke" }
 * Header: x-admin-secret: ADMIN_GRANT_SECRET (min 24 chars)
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_GRANT_SECRET ?? "";
  const provided = req.headers.get("x-admin-secret") ?? "";

  if (expected.length < 24 || !secretsEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; action?: string };
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
    select: {
      id: true,
      email: true,
      plan: true,
      stripeSubscriptionId: true,
    },
  });

  if (body.action === "revoke") {
    if (!existing) {
      return NextResponse.json(
        { error: `No user found for ${email}` },
        { status: 404 },
      );
    }
    // Do not strip an active paid Stripe subscription via this tool —
    // paid users must cancel through Stripe / portal.
    if (existing.stripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "User has an active Stripe subscription — revoke via Stripe portal, not grant-pro.",
        },
        { status: 409 },
      );
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        plan: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
      select: {
        id: true,
        email: true,
        plan: true,
        stripeCurrentPeriodEnd: true,
      },
    });
    console.info(`[grant-pro] revoked ${email}`);
    return NextResponse.json({ ok: true, revoked: true, user });
  }

  if (existing?.stripeSubscriptionId) {
    return NextResponse.json(
      {
        error:
          "User already has a Stripe subscription — no complimentary override.",
      },
      { status: 409 },
    );
  }

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

  console.info(
    `[grant-pro] ${existing ? "updated" : "created"} ${email} → PRO`,
  );

  return NextResponse.json({
    ok: true,
    created: !existing,
    user,
  });
}
