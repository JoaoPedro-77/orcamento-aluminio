# Orçamento Alumínio - Com Sistema de Assinatura

Sistema de orçamentos para pequenas empresas com autenticação e assinatura mensal via Mercado Pago.

## 🚀 Como começar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

**Abra `.env` e preencha:**
- `JWT_SECRET`: Sua chave secreta JWT (gere uma aleatória)
- `MERCADO_PAGO_TOKEN`: Seu token de acesso do Mercado Pago
- `MERCADO_PAGO_WEBHOOK_TOKEN`: Token para validar webhooks

**Para obter credenciais do Mercado Pago:**
1. Vá para https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação
3. Copie o **Access Token** (modo produção ou teste)

### 3. Iniciar o servidor
```bash
npm start
```

O servidor estará disponível em: `http://localhost:3000`

## 📖 Como usar

1. **Acessar a aplicação**: `http://localhost:3000`
2. **Criar conta** ou **fazer login**
3. **Assinar o plano** (R$ 50,00/mês) via Mercado Pago
4. **Usar o sistema** de orçamentos

## 📋 Fluxo

- **Login/Registro** → Cria usuário com assinatura inativa
- **Gerenciar Assinatura** → Abre link do Mercado Pago para checkout
- **Webhook** → Confirma pagamento e ativa assinatura
- **Dashboard** → Acessa apenas com assinatura ativa

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- Tokens JWT com expiração
- Validação de webhooks com token secreto
- Middleware para verificar autenticação e assinatura

## 💾 Banco de dados

SQLite local (`database.db`) com tabelas:
- `users` - Usuários registrados
- `subscriptions` - Status de assinatura

## ⚙️ Configuração Mercado Pago (Webhook)

Para receber confirmações de pagamento:

1. No painel do Mercado Pago, vá para **Configurações > Notificações**
2. Adicione uma URL de Webhook:
   ```
   https://seu-dominio.com/api/payment/webhook
   ```
3. Use o mesmo token do `.env` em `MERCADO_PAGO_WEBHOOK_TOKEN`

## 📝 Estrutura do projeto

```
├── server.js              # Servidor Express
├── db.js                  # Conexão SQLite
├── routes/
│   ├── auth.js           # Login/Registro
│   └── payment.js        # Assinatura Mercado Pago
├── middleware/
│   ├── auth.js           # Validar JWT
│   └── checkSubscription.js # Verificar assinatura
├── login.html            # Página de login
├── app.html              # Dashboard (protegido)
├── index.html            # Redireciona ao login
└── css/
    └── style.css         # Estilos
```

## 🐛 Troubleshooting

- **Erro de conexão com Mercado Pago**: Verifique seu `MERCADO_PAGO_TOKEN`
- **Login não funciona**: Certifique-se de que o banco de dados foi criado (`database.db`)
- **Webhook não recebe eventos**: Verifique se a URL é acessível e o token está correto

## 📞 Suporte

Para dúvidas sobre Mercado Pago, acesse: https://www.mercadopago.com.br/developers/pt
