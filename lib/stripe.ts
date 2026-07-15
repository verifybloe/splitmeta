import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  stripeClient = new Stripe(key, { typescript: true });
  return stripeClient;
}

/** @deprecated Prefer getStripe() — kept for existing imports */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID is not set");
  }
  return priceId;
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}
