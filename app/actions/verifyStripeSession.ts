"use server"

import { createClient } from "@/utils/supabase/server";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

const PRICE_IDS = {
  'price_1QgVTvG3gK5JpVOEcPjDV5jD': 10,
  'price_1QgVUGG3gK5JpVOEI8TWA6Lt': 100,
} as const;

export async function verifyStripeSession(sessionId: string) {
  const supabase = await createClient();

  try {
    // Retrieve the session to verify its status
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price']
    });
    
    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Payment not completed' };
    }

    // Check if this session has already been processed
    const { data: existingTransaction } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('payment_id', sessionId)
      .single();

    if (existingTransaction) {
      console.log('Session already processed:', sessionId);
      return { success: true };
    }

    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('No user ID in session metadata');
      return { success: false, error: 'User ID not found' };
    }

    const priceId = session.line_items?.data[0]?.price?.id;
    if (!priceId || !(priceId in PRICE_IDS)) {
      console.error('Invalid price ID:', priceId);
      return { success: false, error: 'Invalid price ID' };
    }

    const amount = PRICE_IDS[priceId as keyof typeof PRICE_IDS];
    console.log("Processing token purchase:", { userId, amount, sessionId });

    // Insert token transaction if webhook hasn't processed it yet
    const { error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: 'purchase',
        payment_id: sessionId,
        is_purchased: true
      });

    if (transactionError) {
      console.error('Error recording transaction:', {
        error: transactionError,
        details: transactionError.details,
        hint: transactionError.hint,
        message: transactionError.message
      });
      return { success: false, error: 'Failed to process token purchase' };
    }

    // Verify the token balance was updated by the trigger
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('purchased_tokens')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error verifying token balance:', profileError);
      return { success: false, error: 'Failed to verify token balance' };
    }

    console.log('Token purchase completed:', {
      userId,
      amount,
      sessionId,
      currentBalance: profile.purchased_tokens
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying stripe session:', error);
    return { success: false, error: 'Failed to verify payment' };
  }
}
