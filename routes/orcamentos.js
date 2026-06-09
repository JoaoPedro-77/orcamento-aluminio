const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/orcamentos - Lista todos os orçamentos do usuário logado
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orcamentos WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar orcamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// POST /api/orcamentos - Salva um novo orçamento
router.post('/', async (req, res) => {
  const { data, cliente, produto, largura, altura, pecas, desconto, margem, totais } = req.body;

  if (!cliente) {
    return res.status(400).json({ error: 'Cliente é obrigatório' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orcamentos (user_id, data, cliente, produto, largura, altura, pecas, desconto, margem, totais) 
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb) RETURNING *`,
      [req.user.id, data, cliente, produto, largura, altura, JSON.stringify(pecas), desconto, margem, JSON.stringify(totais)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar orcamento:', err);
    res.status(500).json({ error: 'Erro ao salvar orçamento' });
  }
});

// DELETE /api/orcamentos/:id - Exclui um orçamento
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM orcamentos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou não autorizado' });
    }
    
    res.json({ message: 'Orçamento excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir orcamento:', err);
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});

module.exports = router;
