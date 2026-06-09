const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, company_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // RETURNING evita um SELECT separado após o INSERT
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, company_name) VALUES ($1, $2, $3) RETURNING id, email',
      [email, passwordHash, company_name || 'Empresa']
    );
    const user = result.rows[0];

    await pool.query(
      'INSERT INTO subscriptions (user_id, status) VALUES ($1, $2)',
      [user.id, 'inactive']
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Usuário criado com sucesso',
      token,
      user: { id: user.id, email: user.email },
    });

  } catch (err) {
    // Código 23505 = unique_violation no PostgreSQL
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro em /register:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    // Mesma mensagem para não encontrado e senha errada (evita enumeração de usuários)
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email },
    });

  } catch (err) {
    console.error('Erro em /login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;