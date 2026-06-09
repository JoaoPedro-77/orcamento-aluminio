const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/config - Obtém as configurações do usuário
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM configuracoes WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Retorna configurações vazias/default se não existir
      res.json({ empresa: '', telefone: '', cidade: '', margem: 0, desconto: 0 });
    }
  } catch (err) {
    console.error('Erro ao buscar configuracoes:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// POST /api/config - Atualiza as configurações do usuário
router.post('/', async (req, res) => {
  const { empresa, telefone, cidade, margem, desconto } = req.body;

  try {
    // Usamos INSERT ... ON CONFLICT (requer constraint unique/primary key) para fazer upsert
    const result = await pool.query(
      `INSERT INTO configuracoes (user_id, empresa, telefone, cidade, margem, desconto) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         empresa = EXCLUDED.empresa, 
         telefone = EXCLUDED.telefone, 
         cidade = EXCLUDED.cidade, 
         margem = EXCLUDED.margem, 
         desconto = EXCLUDED.desconto 
       RETURNING *`,
      [req.user.id, empresa, telefone, cidade, margem || 0, desconto || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar configuracoes:', err);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

module.exports = router;
