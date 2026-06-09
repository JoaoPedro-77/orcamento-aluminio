require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

// ==========================================
// EDITE OS DADOS DO SEU CLIENTE ABAIXO
// ==========================================
const NOVO_USUARIO = {
  email: "cliente@empresa.com",      // Email de login
  password: "senha123",              // Senha do cliente (mínimo 6 caracteres)
  company_name: "Empresa do Cliente" // Nome da empresa
};

async function createUser() {
  console.log(`⏳ Criando usuário ${NOVO_USUARIO.email}...`);

  try {
    // 1. Criptografa a senha
    const passwordHash = await bcrypt.hash(NOVO_USUARIO.password, 10);

    // 2. Insere o usuário na tabela 'users'
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, company_name) VALUES ($1, $2, $3) RETURNING id',
      [NOVO_USUARIO.email, passwordHash, NOVO_USUARIO.company_name]
    );
    const userId = userResult.rows[0].id;

    // 3. Cria o status de assinatura para ele
    await pool.query(
      'INSERT INTO subscriptions (user_id, status) VALUES ($1, $2)',
      [userId, 'active'] // Já criamos como ativo para ele não ter bloqueios iniciais
    );

    console.log('✅ Usuário criado com sucesso no banco de dados!');
    console.log(`   Email: ${NOVO_USUARIO.email}`);
    console.log(`   Senha: ${NOVO_USUARIO.password}`);

  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ Erro: Este email já está cadastrado no banco de dados.');
    } else {
      console.error('❌ Erro ao criar usuário:', err);
    }
  } finally {
    // Fecha a conexão com o banco e finaliza o script
    pool.end();
    process.exit();
  }
}

createUser();
