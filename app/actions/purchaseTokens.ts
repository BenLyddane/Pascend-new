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
  10: process.env.STRIPE_PRICE_ID_10,
  100: process.env.STRIPE_PRICE_ID_100,
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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/protected/collection/create-cards?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
      metadata: {
        userId: userId,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

export async function handleTokenPurchaseSuccess(session: Stripe.Checkout.Session) {
  const supabase = await createClient();
  const userId = session.metadata?.userId;
  
  if (!userId) {
    throw new Error('User ID not found in session metadata');
  }

  // Get the token amount from the price ID
  const tokenAmount = Object.entries(PRICE_IDS).find(
    ([_, priceId]) => priceId === session.line_items?.data[0]?.price?.id
  )?.[0];

  if (!tokenAmount) {
    throw new Error('Invalid price ID in session');
  }

  const amount = parseInt(tokenAmount);

  try {
    // Start a transaction
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('tokens')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    // Update tokens
    const { error: updateError } = await supabase
      .from('player_profiles')
      .update({ tokens: (profile?.tokens || 0) + amount })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error('Failed to update tokens');
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: 'purchase',
        payment_id: session.id
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Don't throw here as tokens were already credited
    }

  } catch (error) {
    console.error('Error processing token purchase:', error);
    throw error;
  }
}
