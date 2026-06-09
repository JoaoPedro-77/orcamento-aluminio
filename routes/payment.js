const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Rota para iniciar a assinatura via Stripe Checkout Session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Pagamentos não estão disponíveis no momento' });
  }

  try {
    const user = req.user;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      client_reference_id: user.id.toString(),
      customer_email: user.email,
      success_url: `${process.env.APP_URL || 'http://localhost:3001'}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3001'}/app.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Erro ao criar sessão do Stripe:', err);
    res.status(500).json({ error: 'Erro ao processar o pagamento com Stripe' });
  }
});

// Webhook para escutar eventos do Stripe
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Erro na assinatura do webhook do Stripe: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Sucesso de pagamento: ativa a assinatura
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const stripeSubscriptionId = session.subscription;

    const renewAt = new Date();
    renewAt.setMonth(renewAt.getMonth() + 1);

    await pool.query(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, status, renew_at)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (user_id) DO UPDATE
         SET stripe_subscription_id = $2, status = 'active', renew_at = $3`,
      [userId, stripeSubscriptionId, renewAt.toISOString()]
    );
  }

  // Cancelamento ou falha: desativa a assinatura
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    await pool.query(
      `UPDATE subscriptions SET status = 'inactive' WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );
  }

  res.json({ received: true });
});

module.exports = router;
