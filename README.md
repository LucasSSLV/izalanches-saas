# SAAS Iza - Sistema de Gestão para Lanchonete

Sistema completo de gestão de pedidos, cardápio digital e relatórios financeiros para lanchonetes.

## 🚀 Funcionalidades

### Cardápio Digital (Cliente)
- Visualização de produtos com fotos, descrição e preços
- Filtro por categorias
- Carrinho de compras
- Geração de pedido formatado para envio via WhatsApp
- Suporte a pagamento PIX e Dinheiro

### Painel do Atendente
- **Gestão de Pedidos (Kanban)**
  - Visualização em tempo real dos pedidos
  - Arrastar e soltar para alterar status
  - Notificações automáticas via WhatsApp quando o pedido muda de status
  - Impressão de recibos via Bluetooth (ESC/POS)

- **Gestão de Produtos**
  - CRUD completo de produtos e categorias
  - Upload de imagens
  - Controle de disponibilidade (Em Falta/Disponível)
  - Atualização em tempo real no cardápio digital

- **Relatórios Financeiros**
  - Filtro por período (data inicial e final)
  - Total de pedidos, receita total
  - Separação por método de pagamento (PIX/Dinheiro)
  - Listagem detalhada de pedidos do período

### Integração WhatsApp (Twilio)
- Webhook para receber pedidos via WhatsApp
- Envio automático de notificações de status
- Parse automático de mensagens para criar pedidos

### Impressão Bluetooth
- Impressão de recibos térmicos via Bluetooth
- Geração de PIX QR Code na nota (quando pagamento via PIX)
- Cálculo e exibição de troco (quando pagamento em dinheiro)

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) - Compatível com Node.js 18+
- **Backend/Banco de Dados**: Supabase (PostgreSQL, Realtime, Storage)
- **Comunicação WhatsApp**: Twilio
- **Impressão**: Web Bluetooth API (ESC/POS)
- **PIX QR Code**: Geração customizada de payload PIX
- **UI**: Tailwind CSS, Lucide React Icons
- **Drag & Drop**: @dnd-kit

## 📋 Pré-requisitos

- Node.js 18.20+ (recomendado Node.js 20+ para melhor performance) 
- Conta no Supabase
- Conta no Twilio (com WhatsApp Business API configurado)
- Impressora térmica Bluetooth compatível com ESC/POS

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd saas-iza
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
```

4. Configure o banco de dados:
   - Acesse o painel do Supabase (https://supabase.com/dashboard)
   - Vá em **SQL Editor** (ícone de banco de dados no menu lateral)
   - Clique em **New Query**
   - Copie e cole o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql` ou `supabase/migrations/001_initial_schema_clean.sql`
   - Clique em **Run** (ou pressione Ctrl+Enter)
   - ⚠️ **IMPORTANTE**: Copie o CONTEÚDO do arquivo SQL, não o caminho do arquivo!

5. Configure o Storage no Supabase:
- Crie um bucket chamado `products` no Supabase Storage
- Configure as políticas de acesso conforme necessário

6. Configure o webhook do Twilio:
   
   **⚠️ IMPORTANTE:** Você NÃO cria URL no Twilio. Você usa a URL da SUA aplicação no Twilio!
   
   **Entendendo o fluxo:**
   
   ```
   Cliente (WhatsApp) 
     ↓ envia mensagem
   Twilio (recebe a mensagem)
     ↓ envia para webhook
   SUA APLICAÇÃO Next.js (/api/twilio/webhook)
     ↓ processa e salva
   Supabase (banco de dados)
   ```
   
   **O que você precisa fazer:**
   
   1. **Primeiro, exponha sua aplicação publicamente:**
      
      **Opção A - Desenvolvimento LOCAL (precisa do ngrok):**
      
      ⚠️ **Quando usar:** Enquanto você está desenvolvendo/testando no seu computador (`localhost:3000`)
      
      ```bash
      # Instale o ngrok: https://ngrok.com/download
      # Execute seu servidor Next.js
      npm run dev
      
      # Em outro terminal, execute o ngrok
      ngrok http 3000
      ```
      Você receberá uma URL como: `https://abc123.ngrok.io`
      Sua URL do webhook será: `https://abc123.ngrok.io/api/twilio/webhook`
      
      **⚠️ IMPORTANTE:** O ngrok é temporário! A URL muda toda vez que você reinicia o ngrok.
      
      **Opção B - PRODUÇÃO (NÃO precisa do ngrok):**
      
      ✅ **Quando usar:** Quando a aplicação estiver hospedada em um servidor (Vercel, Railway, etc.)
      
      Faça deploy da sua aplicação e você terá uma URL permanente:
      - Vercel: `https://seu-projeto.vercel.app/api/twilio/webhook`
      - Railway: `https://seu-projeto.railway.app/api/twilio/webhook`
      - Outros: `https://seu-dominio.com/api/twilio/webhook`
      
      **Resumo:**
      - 🏠 **Desenvolvendo no seu PC** (`localhost`) → **PRECISA do ngrok**
      - 🌐 **Aplicação hospedada online** → **NÃO precisa do ngrok**
   
   2. **Depois, configure no Twilio:**
      
      - Acesse o [Console do Twilio](https://console.twilio.com/)
      - Vá em **Messaging** → **Settings** → **WhatsApp Sandbox** (ou **Try it out** → **Send a WhatsApp message**)
      - Procure pela seção **"When a message comes in"** ou **"Webhook URL"**
      - Cole a URL que você obteve no passo 1 (ex: `https://abc123.ngrok.io/api/twilio/webhook`)
      - Selecione o método HTTP: **POST**
      - Salve as configurações
   
   3. **Pronto!** Agora quando alguém enviar mensagem para o número do Twilio, ele enviará para sua aplicação.
   
   **Resumo:**
   - ✅ Você cria a URL da sua aplicação (Next.js)
   - ✅ Você cola essa URL no Twilio (configuração de webhook)
   - ✅ O Supabase é apenas o banco de dados (não precisa configurar webhook lá)
   - ❌ Você NÃO cria URL no Twilio
   - ❌ Você NÃO configura webhook no Supabase
   
   **Testando:**
   - Envie uma mensagem de teste do WhatsApp para o número do Twilio
   - Verifique os logs do terminal onde está rodando `npm run dev`
   - Verifique no painel do atendente (`/painel`) se o pedido foi criado

7. Execute o projeto:
```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## 📱 Uso

### Cardápio Digital
Acesse `/cardapio` para ver o cardápio público. Os clientes podem:
- Navegar pelos produtos
- Adicionar itens ao carrinho
- Preencher dados e enviar pedido via WhatsApp

### Painel do Atendente
Acesse `/painel` (requer autenticação) para:
- Gerenciar pedidos (arrastar entre colunas)
- Gerenciar produtos e categorias
- Visualizar relatórios financeiros
- Imprimir recibos

### Login
Acesse `/login` para fazer login no painel. Você precisará criar um usuário no Supabase Auth primeiro.

## 🔐 Autenticação

O sistema usa Supabase Auth. Para criar o primeiro usuário:
1. Acesse o painel do Supabase
2. Vá em Authentication > Users
3. Crie um novo usuário manualmente ou configure o registro

## 📦 Estrutura do Projeto

```
saas-iza/
├── app/
│   ├── cardapio/          # Página pública do cardápio
│   ├── login/             # Página de login
│   ├── painel/            # Painel do atendente
│   └── api/
│       └── twilio/        # Webhook do Twilio
├── components/            # Componentes React
├── lib/
│   ├── supabase/          # Cliente Supabase
│   ├── twilio/            # Cliente Twilio e parser
│   ├── bluetooth/         # Utilitários de impressão
│   └── pix/               # Geração de PIX QR Code
├── types/                 # Tipos TypeScript
└── supabase/
    └── migrations/        # Migrações do banco
```

## 🎨 Personalização

### Cores e Estilo
O projeto usa Tailwind CSS. Você pode personalizar as cores editando as classes nos componentes.

### Nome da Lanchonete
Edite o texto "LANCHONETE" em `lib/bluetooth/receipt.ts` para personalizar o nome no recibo.

## 🐛 Troubleshooting

### Erro ao executar SQL no Supabase
**Erro:** `syntax error at or near "supabase"`

**Solução:** Você está tentando executar o caminho do arquivo em vez do conteúdo SQL.
1. Abra o arquivo `supabase/migrations/001_initial_schema.sql` no seu editor
2. Selecione TODO o conteúdo do arquivo (Ctrl+A)
3. Copie (Ctrl+C)
4. No Supabase SQL Editor, cole o conteúdo (Ctrl+V)
5. Execute (Ctrl+Enter)

**Alternativa:** Use o arquivo `001_initial_schema_clean.sql` que não tem comentários.

### Impressora Bluetooth não conecta
- Certifique-se de que a impressora está ligada e no modo de pareamento
- Verifique se o navegador suporta Web Bluetooth API (Chrome/Edge)
- Alguns navegadores podem exigir HTTPS para Web Bluetooth

### Webhook do Twilio não funciona
- Verifique se a URL do webhook está correta
- Certifique-se de que o servidor está acessível publicamente
- Verifique os logs do servidor para erros

### Produtos não aparecem no cardápio
- Verifique se os produtos estão marcados como `available = true`
- Verifique as políticas RLS no Supabase

## 📝 Licença

Este projeto é privado e proprietário.

## 🤝 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.
# izalanches-saas
