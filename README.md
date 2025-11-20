# SAAS Iza - Sistema de Gestão para Lanchonete

Sistema completo de gestão de pedidos, cardápio digital e relatórios financeiros para lanchonetes, com integração WhatsApp e impressão de recibos via Bluetooth.

## ✨ Visão Geral

**Painel Kanban de Pedidos**
<img src="https://i.imgur.com/gJm2Ym6.png" width="100%" />

**Cardápio Digital**
<img src="https://i.imgur.com/p5x3gvo.png" width="100%" />

**Relatórios Financeiros**
<img src="https://i.imgur.com/gJm2Ym6.png" width="100%" />

## ✨ Funcionalidades

### Cardápio Digital (Cliente)
- Visualização de produtos com fotos, descrição e preços.
- Filtro por categorias.
- Carrinho de compras e geração de pedido formatado para envio via WhatsApp.
- Suporte a pagamento PIX e Dinheiro.

### Painel do Atendente
- **Gestão de Pedidos (Kanban):** Visualização em tempo real, alteração de status com drag & drop, e notificações automáticas via WhatsApp.
- **Impressão de Recibos:** Impressão via Bluetooth (ESC/POS) com QR Code PIX ou cálculo de troco.
- **Gestão de Produtos:** CRUD completo de produtos e categorias com upload de imagens e controle de disponibilidade.
- **Relatórios Financeiros:** Filtro por período, com totais e detalhamento por método de pagamento.

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 14 (App Router)
- **UI**: Tailwind CSS, Lucide React Icons
- **Drag & Drop**: @dnd-kit
- **Backend/Banco de Dados**: Supabase (PostgreSQL, Realtime, Storage)
- **Comunicação WhatsApp**: Twilio
- **Impressão**: Web Bluetooth API (ESC/POS)
- **PIX QR Code**: Geração customizada de payload PIX

---

## 🛠️ Começando

### 📋 Pré-requisitos
- Node.js 18.20+ (recomendado Node.js 20+)
- Conta no [Supabase](https://supabase.com/)
- Conta no [Twilio](https://www.twilio.com/) (com WhatsApp Business API configurado)
- Impressora térmica Bluetooth compatível com ESC/POS

### 🔧 Instalação Local

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Luki-n/saas-iza
    cd saas-iza
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env.local` na raiz do projeto e preencha com suas chaves.

    ```env
    # Supabase
    # Vá em Project Settings > API > Project URL
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    # Vá em Project Settings > API > Project API Keys > anon (public)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

    # Twilio
    # Encontre no seu Twilio Console Dashboard
    TWILIO_ACCOUNT_SID=your_twilio_account_sid
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    # Número do WhatsApp fornecido pelo Twilio (ex: whatsapp:+14155238886)
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

    # WhatsApp
    # Número do seu negócio para o cliente entrar em contato (ex: 5511999999999)
    NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
    ```

4.  **Configure o banco de dados:**
    - Acesse seu painel do Supabase.
    - Vá para **SQL Editor**.
    - Copie **todo o conteúdo** do arquivo `supabase/migrations/001_initial_schema.sql`.
    - Cole no editor do Supabase e clique em **Run**.

5.  **Configure o Storage no Supabase:**
    - No painel do Supabase, vá em **Storage**.
    - Crie um bucket chamado `products`.
    - Configure as políticas de acesso para permitir leitura pública e escrita autenticada.

6.  **Configure o webhook do Twilio:**
    Para que o Twilio envie mensagens para sua aplicação, você precisa de uma URL pública.
    - **Para desenvolvimento local:** Use o `ngrok` para expor sua porta `3000`.
      ```bash
      # Instale: https://ngrok.com/download
      # Em um terminal, rode a aplicação:
      npm run dev
      # Em outro terminal, exponha a porta:
      ngrok http 3000
      ```
      Sua URL de webhook será `https://<id-aleatorio>.ngrok.io/api/twilio/webhook`.
    - **Para produção:** Use a URL do seu deploy (Vercel, etc.): `https://seu-site.com/api/twilio/webhook`.

    Depois, cole a URL no [Console do Twilio](https://console.twilio.com/) em **Messaging > Settings > WhatsApp Sandbox**, no campo **"When a message comes in"**, usando o método **POST**.

7.  **Execute o projeto:**
    ```bash
    npm run dev
    ```
    Acesse `http://localhost:3000` no navegador.

### 🚀 Deploy
O jeito mais fácil de fazer o deploy é usando a Vercel. Após configurar suas variáveis de ambiente no painel da Vercel, o projeto será buildado e implantado automaticamente.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLuki-n%2Fsaas-iza&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_WHATSAPP_FROM,NEXT_PUBLIC_WHATSAPP_NUMBER)

---

## 📖 Guias de Referência

### 📱 Uso da Aplicação
- **Cardápio Digital:** Acesse `/cardapio` para a visão do cliente.
- **Painel do Atendente:** Acesse `/painel` para gerenciar pedidos, produtos e finanças.
- **Login:** Acesse `/login`. O primeiro usuário deve ser criado manualmente no painel do Supabase em **Authentication > Users**.

### 📦 Estrutura do Projeto
```
saas-iza/
├── app/
│   ├── cardapio/          # Página pública do cardápio
│   ├── login/             # Página de login
│   ├── painel/            # Painel do atendente
│   └── api/
│       └── twilio/        # Webhooks e rotas da API Twilio
├── components/            # Componentes React reutilizáveis
├── lib/                   # Lógica de negócio, clientes de API
├── types/                 # Tipos TypeScript
└── supabase/
    └── migrations/        # Migrações do banco de dados
```

### 🗃️ Schema do Banco de Dados
O banco de dados é composto por 4 tabelas principais:

- **`categories`**: Armazena as categorias dos produtos.
  - `id`, `name`, `created_at`, `updated_at`
- **`products`**: Armazena os produtos.
  - `id`, `name`, `description`, `price`, `category_id`, `image_url`, `available`
- **`orders`**: Armazena os pedidos.
  - `id`, `customer_name`, `customer_phone`, `total`, `payment_method`, `status`, `change_amount`
- **`order_items`**: Itens de um pedido específico, ligando `orders` e `products`.
  - `id`, `order_id`, `product_id`, `quantity`, `price`, `subtotal`

Políticas de segurança (RLS) estão ativadas para garantir que usuários autenticados só possam gerenciar dados e que o público só possa ler produtos e categorias disponíveis.

### 🔌 API Reference

#### `POST /api/twilio/webhook`
Webhook que recebe mensagens do WhatsApp vindas do Twilio.
- **Função:** Processa a mensagem de um cliente, extrai os detalhes do pedido e o salva no banco de dados.
- **Corpo da Requisição:** O formato é definido pelo Twilio. A aplicação parseia o `Body` e o `From` para criar um novo pedido.
- **Segurança:** A rota deve ser protegida para aceitar requisições apenas do Twilio.

#### `POST /api/twilio/send-message`
Envia uma mensagem de notificação para o cliente via WhatsApp.
- **Função:** Usado para notificar o cliente sobre mudanças no status do pedido (ex: "Seu pedido saiu para entrega").
- **Corpo da Requisição (exemplo):**
  ```json
  {
    "to": "whatsapp:+5511999999999",
    "body": "Seu pedido foi atualizado!"
  }
  ```

### 🐛 Troubleshooting
- **Erro de SQL no Supabase:** Certifique-se de copiar o **conteúdo** do arquivo `.sql`, não o caminho.
- **Impressora não conecta:** Verifique se o Bluetooth está ativo e se o navegador suporta a Web Bluetooth API (Chrome/Edge são recomendados).
- **Webhook não funciona:** Use o `ngrok` para testar localmente e verifique os logs do servidor para qualquer erro.

## 📝 Licença
Este projeto é privado e proprietário.

## 🤝 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.
