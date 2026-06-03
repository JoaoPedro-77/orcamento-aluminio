const express = require('express');
const { MercadoPagoConfig, PreApprovalPlan, PreApproval } = require('mercadopago');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_TOKEN,
});

const subscriptionPrice = parseFloat(process.env.SUBSCRIPTION_PRICE) || 50;

router.post('/create-subscription', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    const preApprovalPlan = new PreApprovalPlan(client);
    
    const planResponse = await preApprovalPlan.create({
      data: {
        reason: 'Assinatura Mensal - Orçamento Alumínio',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: subscriptionPrice,
          currency_id: 'BRL'
        }
      }
    });

    const preApproval = new PreApproval(client);
    
    const subscriptionResponse = await preApproval.create({
      data: {
        preapproval_plan_id: planResponse.id,
        payer_email: user.email,
        card_token_id: req.body.card_token_id
      }
    });

    db.run(
      'UPDATE subscriptions SET mercado_pago_id = ?, status = ? WHERE user_id = ?',
      [subscriptionResponse.id, 'pending', user.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: 'Assinatura criada com sucesso',
          subscription_id: subscriptionResponse.id
        });
      }
    );
  } catch (err) {
    console.error('Erro ao criar assinatura:', err);
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

router.post('/webhook', (req, res) => {
  const token = req.headers['x-webhook-token'];
  
  if (token !== process.env.MERCADO_PAGO_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { type, data } = req.body;

  if (type === 'subscription_preapproval') {
    const subscriptionId = data.id;
    const status = data.status;

    const query = 'SELECT user_id FROM subscriptions WHERE mercado_pago_id = ?';
    db.get(query, [subscriptionId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const renewAt = new Date();
      renewAt.setMonth(renewAt.getMonth() + 1);

      db.run(
        'UPDATE subscriptions SET status = ?, renew_at = ? WHERE user_id = ?',
        [status === 'authorized' ? 'active' : 'inactive', renewAt.toISOString(), row.user_id],
        (err) => {
          if (err) {
            console.error('Erro ao atualizar assinatura:', err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true });
        }
      );
    });
  } else {
    res.json({ success: true });
  }
});

module.exports = router;
