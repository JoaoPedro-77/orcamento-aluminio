const db = require('../db');

const checkSubscription = (req, res, next) => {
  const query = 'SELECT status, renew_at FROM subscriptions WHERE user_id = ?';
  db.get(query, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const isActive = row && row.status === 'active' && new Date(row.renew_at) > new Date();
    
    if (!isActive) {
      return res.status(403).json({ error: 'Assinatura inativa ou expirada' });
    }
    
    next();
  });
};

module.exports = checkSubscription;
