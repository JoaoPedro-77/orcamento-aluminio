require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
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

app.get('/api/status', authMiddleware, (req, res) => {
  res.json({ authenticated: true, user_id: req.user.id });
});

app.get('/api/subscription-status', authMiddleware, (req, res) => {
  try {
    const row = db.prepare('SELECT status, renew_at FROM subscriptions WHERE user_id = ?').get(req.user.id);
    const isActive = row && row.status === 'active' && new Date(row.renew_at) > new Date();
    res.json({ 
      active: isActive, 
      subscription: row || { status: 'inactive' } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
