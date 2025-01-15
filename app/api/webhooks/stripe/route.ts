import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const createServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
};

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

const PRICE_IDS = {
  'price_1QgVTvG3gK5JpVOEcPjDV5jD': 10,
  'price_1QgVUGG3gK5JpVOEI8TWA6Lt': 100,
} as const;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Error verifying webhook signature:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      if (!userId) {
        console.error("No user ID in session metadata");
        return new Response("No user ID found", { status: 400 });
      }

      // Check if this session has already been processed
      const { data: existingTransaction } = await supabase
        .from('token_transactions')
        .select('id')
        .eq('payment_id', session.id)
        .single();

      if (existingTransaction) {
        console.log('Session already processed:', session.id);
        return new Response("Session already processed", { status: 200 });
      }

      // Get the price ID from the line items
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price']
      });

      const priceId = expandedSession.line_items?.data[0]?.price?.id;
      if (!priceId || !(priceId in PRICE_IDS)) {
        console.error("Invalid price ID:", priceId);
        return new Response("Invalid price ID", { status: 400 });
      }

      const amount = PRICE_IDS[priceId as keyof typeof PRICE_IDS];
      console.log("Processing token purchase:", { 
        userId, 
        amount, 
        sessionId: session.id,
        priceId,
        expandedSession: {
          paymentStatus: expandedSession.payment_status,
          status: expandedSession.status,
          amountTotal: expandedSession.amount_total
        }
      });

      // First verify the player profile exists
      const { data: profile, error: profileError } = await supabase
        .from('player_profiles')
        .select('purchased_tokens')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching player profile:', {
          error: profileError,
          userId
        });
        throw new Error('Failed to fetch player profile');
      }

      console.log('Current player profile:', {
        userId,
        currentTokens: profile.purchased_tokens
      });

      // Insert token transaction - this will trigger the update_token_balance trigger
      const { data: transaction, error: transactionError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: 'purchase',
          payment_id: session.id,
          is_purchased: true
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error recording transaction:', {
          error: transactionError,
          details: transactionError.details,
          hint: transactionError.hint,
          message: transactionError.message,
          code: transactionError.code
        });
        throw new Error(`Failed to process token purchase: ${transactionError.message}`);
      }

      // Verify the token balance was updated
      const { data: updatedProfile, error: verifyError } = await supabase
        .from('player_profiles')
        .select('purchased_tokens')
        .eq('user_id', userId)
        .single();

      console.log('Token purchase completed:', {
        transactionId: transaction?.id,
        userId,
        amount,
        sessionId: session.id,
        previousBalance: profile.purchased_tokens,
        newBalance: updatedProfile?.purchased_tokens
      });

      if (verifyError || !updatedProfile || updatedProfile.purchased_tokens !== profile.purchased_tokens + amount) {
        console.error('Token balance not updated correctly:', {
          previousBalance: profile.purchased_tokens,
          expectedNewBalance: profile.purchased_tokens + amount,
          actualNewBalance: updatedProfile?.purchased_tokens
        });
        throw new Error('Token balance not updated correctly');
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook error", { status: 500 });
  }
}
