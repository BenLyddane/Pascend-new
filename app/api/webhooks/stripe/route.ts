import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleTokenPurchaseSuccess } from '@/app/actions/purchaseTokens';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') || '';

  if (!signature) {
    return new NextResponse('No signature', { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      console.log('Processing completed checkout session:', event.data.object.id);
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        await handleTokenPurchaseSuccess(session);
        console.log('Successfully processed token purchase for session:', session.id);
      } catch (error) {
        console.error('Failed to process token purchase:', error);
        // We should still return 200 to acknowledge receipt of the webhook
        // but log the error for investigation
        return new NextResponse(JSON.stringify({ error: 'Failed to process token purchase' }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new NextResponse('Webhook error', { status: 400 });
  }
}
