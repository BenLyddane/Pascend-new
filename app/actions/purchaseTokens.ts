"use server";

import { createClient } from "@/utils/supabase/server";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

export type TokenAmount = 10 | 100;

const PRICE_IDS = {
  10: 'price_1QgVTvG3gK5JpVOEcPjDV5jD',
  100: 'price_1QgVUGG3gK5JpVOEI8TWA6Lt',
} as const;

export async function createTokenPurchaseSession(userId: string, amount: TokenAmount) {
  const supabase = await createClient();

  // Get user's email for Stripe customer creation
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user?.email) {
    throw new Error('User email not found');
  }

  try {
    // Create or retrieve Stripe customer
    const { data: customers } = await stripe.customers.search({
      query: `email:'${profile.user.email}'`,
    });

    let customerId = customers?.[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.user.email,
        metadata: {
          userId: userId
        }
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: PRICE_IDS[amount],
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/protected/tokens?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/protected/tokens`,
      metadata: {
        userId: userId,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', {
      error,
      userId,
      amount,
      priceId: PRICE_IDS[amount]
    });
    if (error instanceof Error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
    throw new Error('Failed to create checkout session');
  }
}
