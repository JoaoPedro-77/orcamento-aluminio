require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const orcamentosRoutes = require('./routes/orcamentos');
const configRoutes = require('./routes/config');
const authMiddleware = require('./middleware/auth');
const checkSubscription = require('./middleware/checkSubscription');

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/payment/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orcamentos', authMiddleware, orcamentosRoutes);
app.use('/api/config', authMiddleware, configRoutes);

app.get('/api/status', authMiddleware, (req, res) => {
  res.json({ authenticated: true, user_id: req.user.id });
});

app.get('/api/subscription-status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status, renew_at FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const row = result.rows[0];
    const isActive = row && row.status === 'active' && new Date(row.renew_at) > new Date();
    res.json({
      active: isActive,
      subscription: row || { status: 'inactive' },
    });
  } catch (err) {
    console.error('Erro em /api/subscription-status:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

const PORT = process.env.PORT || 3001;

// O Vercel define variáveis de ambiente próprias (como VERCEL="1"). 
// Apenas inicializamos o servidor na porta se não estivermos na Vercel (rodando localmente).
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  });
}

// Exportar o app para que a Vercel (Serverless) possa gerenciá-lo
module.exports = app;
