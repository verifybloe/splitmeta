import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl, getStripePriceId, stripe } from "@/lib/stripe";

async function ensureLiveCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}) {
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        return existing.id;
      }
    } catch {
      // Stale test-mode customer ID, or customer deleted — recreate below.
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        plan: "FREE",
      },
    });
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const customerId = await ensureLiveCustomer(user);

    if (user.plan === "PRO") {
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${getAppUrl()}/account`,
        });
        return NextResponse.json({ url: portal.url });
      } catch {
        // Fall through to checkout if portal isn't set up / stale sub.
      }
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      success_url: `${getAppUrl()}/account?checkout=success`,
      cancel_url: `${getAppUrl()}/account?checkout=canceled`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
