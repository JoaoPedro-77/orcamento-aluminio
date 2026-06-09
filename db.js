const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      stripe_subscription_id TEXT,
      status TEXT DEFAULT 'inactive',
      renew_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      user_id INTEGER PRIMARY KEY,
      empresa TEXT,
      telefone TEXT,
      cidade TEXT,
      margem NUMERIC DEFAULT 0,
      desconto NUMERIC DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL,
      data TEXT,
      cliente TEXT NOT NULL,
      produto TEXT,
      largura NUMERIC,
      altura NUMERIC,
      pecas JSONB DEFAULT '[]'::jsonb,
      desconto NUMERIC DEFAULT 0,
      margem NUMERIC DEFAULT 0,
      totais JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ PostgreSQL conectado e tabelas verificadas');
}

initDb().catch((err) => {
  console.error('❌ Erro ao conectar ao banco de dados:', err.message);
  process.exit(1);
});

module.exports = pool;