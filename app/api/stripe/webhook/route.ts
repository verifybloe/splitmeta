import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function periodEnd(subscription: Stripe.Subscription): Date {
  const end = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end;
  if (typeof end === "number") {
    return new Date(end * 1000);
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

async function setProFromSubscription(subscription: Stripe.Subscription) {
  const allowed =
    subscription.status === "active" || subscription.status === "trialing";
  if (!allowed) {
    throw new Error(
      `Refusing PRO grant for subscription status=${subscription.status}`,
    );
  }

  const expectedPrice = process.env.STRIPE_PRICE_ID;
  const priceId = subscription.items.data[0]?.price.id;
  if (expectedPrice && priceId && priceId !== expectedPrice) {
    throw new Error(
      `Refusing PRO grant for unexpected price ${priceId}`,
    );
  }

  const userId = subscription.metadata.userId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const where = userId ? { id: userId } : { stripeCustomerId: customerId };

  await prisma.user.update({
    where,
    data: {
      plan: "PRO",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd(subscription),
    },
  });
}

async function setFreeFromSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const where = userId ? { id: userId } : { stripeCustomerId: customerId };

  await prisma.user.update({
    where,
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        if (!subscription.metadata.userId && session.metadata?.userId) {
          await stripe.subscriptions.update(subscription.id, {
            metadata: { userId: session.metadata.userId },
          });
          subscription.metadata.userId = session.metadata.userId;
        }
        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          await setProFromSubscription(subscription);
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      if (
        subscription.status === "active" ||
        subscription.status === "trialing"
      ) {
        await setProFromSubscription(subscription);
      } else {
        await setFreeFromSubscription(subscription);
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const subRef =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      if (subRef) {
        const subscription = await stripe.subscriptions.retrieve(subRef);
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          await setFreeFromSubscription(subscription);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await setFreeFromSubscription(subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
