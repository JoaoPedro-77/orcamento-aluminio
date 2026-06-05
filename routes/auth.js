/*
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, company_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, password_hash, company_name) VALUES (?, ?, ?)',
    [email, passwordHash, company_name || 'Empresa'],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Email já cadastrado' });
        }
        return res.status(500).json({ error: err.message });
      }

      const query = 'SELECT id, email FROM users WHERE email = ?';
      db.get(query, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'INSERT INTO subscriptions (user_id, status) VALUES (?, ?)',
          [user.id, 'inactive'],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
              expiresIn: '30d'
            });

            res.json({ 
              message: 'Usuário criado com sucesso',
              token,
              user: { id: user.id, email: user.email }
            });
          }
        );
      });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const query = 'SELECT id, email, password_hash FROM users WHERE email = ?';
  db.get(query, [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({ 
      token,
      user: { id: user.id, email: user.email }
    });
  });
});

module.exports = router;
*/

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, company_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Validação mínima de senha
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);

    const insert = db.prepare(
      'INSERT INTO users (email, password_hash, company_name) VALUES (?, ?, ?)'
    );
    insert.run(email, passwordHash, company_name || 'Empresa');

    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);

    db.prepare(
      'INSERT INTO subscriptions (user_id, status) VALUES (?, ?)'
    ).run(user.id, 'inactive');

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Usuário criado com sucesso',
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    return res.status(500).json({ error: 'Erro interno' }); // ❌ não expõe err.message
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = db.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).get(email);

    // Mesma mensagem para usuário não encontrado e senha errada (evita enumeração)
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;