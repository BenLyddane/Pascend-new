"use server"

import { createClient } from "@/utils/supabase/server";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

export async function verifyStripeSession(sessionId: string) {
  try {
    // Retrieve the session to verify its status
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Only verify the payment status, don't process the purchase
    // The webhook handler will handle the actual token updates
    if (session.payment_status === 'paid') {
      return { success: true };
    }
    
    return { success: false, error: 'Payment not completed' };
  } catch (error) {
    console.error('Error verifying stripe session:', error);
    return { success: false, error: 'Failed to verify payment' };
  }
}
