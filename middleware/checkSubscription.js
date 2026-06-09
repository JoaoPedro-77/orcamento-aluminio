const pool = require('../db');

const checkSubscription = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT status, renew_at FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const row = result.rows[0];
    const isActive = row && row.status === 'active' && new Date(row.renew_at) > new Date();

    if (!isActive) {
      return res.status(403).json({ error: 'Assinatura inativa ou expirada' });
    }

    next();
  } catch (err) {
    console.error('Erro em checkSubscription:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

module.exports = checkSubscription;
