const db = require('../db');

const checkSubscription = (req, res, next) => {
  try {
    const row = db.prepare('SELECT status, renew_at FROM subscriptions WHERE user_id = ?').get(req.user.id);
    const isActive = row && row.status === 'active' && new Date(row.renew_at) > new Date();
    
    if (!isActive) {
      return res.status(403).json({ error: 'Assinatura inativa ou expirada' });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

module.exports = checkSubscription;
