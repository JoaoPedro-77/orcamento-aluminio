const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rota para iniciar a assinatura via Stripe Checkout Session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
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
    // Usa req.rawBody obtido pelo middleware express.json configurado no server.js
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Erro na assinatura do webhook do Stripe: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lida com o evento de sucesso de pagamento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const stripeSubscriptionId = session.subscription;

    const renewAt = new Date();
    renewAt.setMonth(renewAt.getMonth() + 1);

    db.run(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, status, renew_at) 
       VALUES (?, ?, 'active', ?)
       ON CONFLICT(user_id) DO UPDATE SET stripe_subscription_id = ?, status = 'active', renew_at = ?`,
      [userId, stripeSubscriptionId, renewAt.toISOString(), stripeSubscriptionId, renewAt.toISOString()],
      (err) => {
        if (err) console.error('Erro ao salvar assinatura no banco:', err);
      }
    );
  }

  // Lida com cancelamento ou falha de pagamento
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    
    db.run(
      `UPDATE subscriptions SET status = 'inactive' WHERE stripe_subscription_id = ?`,
      [subscription.id],
      (err) => {
        if (err) console.error('Erro ao desativar assinatura no banco:', err);
      }
    );
  }

  res.json({ received: true });
});

module.exports = router;
