# 🚀 Guia de Migração para Multi-Tenant (SaaS)

## 📋 Visão Geral

Este guia vai te ajudar a transformar o sistema de lanchonete única em um **SaaS multi-tenant**, onde múltiplas lanchonetes podem usar o mesmo sistema com dados isolados.

## ⚠️ IMPORTANTE - Leia Antes de Começar

**Faça backup do banco de dados antes de executar as migrations!**

1. Acesse o Supabase Dashboard
2. Vá em Database > Backups
3. Crie um backup manual

---

## 📊 O Que Vai Mudar?

### Antes (Sistema Atual):
```
Um banco de dados → Uma lanchonete
```

### Depois (Multi-Tenant):
```
Um banco de dados → Múltiplas lanchonetes (isoladas)
    ├─→ Lanchonete A (tenant_id: xxx)
    ├─→ Lanchonete B (tenant_id: yyy)
    └─→ Lanchonete C (tenant_id: zzz)
```

### Estrutura Nova:
- ✅ Tabela `tenants` (lanchonetes)
- ✅ Tabela `tenant_users` (usuários por lanchonete)
- ✅ Campo `tenant_id` em TODAS as tabelas
- ✅ Políticas RLS atualizadas (isolamento de dados)
- ✅ Funções auxiliares para multi-tenancy

---

## 🔧 Passo a Passo

### **Passo 1: Executar Migration 006 (Multi-Tenant)**

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie **TODO** o conteúdo de `006_multi_tenant.sql`
4. Cole no editor
5. Clique em **Run** (executar)
6. ✅ Aguarde a mensagem de sucesso

**O que esta migration faz:**
- Cria tabela `tenants`
- Cria tabela `tenant_users`
- Adiciona coluna `tenant_id` em todas as tabelas
- Atualiza políticas RLS
- Cria funções auxiliares

---

### **Passo 2: Migrar Dados Existentes (APENAS SE JÁ TIVER DADOS)**

⚠️ **Pule este passo se estiver começando do zero!**

Se você já tem categorias, produtos ou pedidos no banco:

1. **EDITE** o arquivo `007_migrate_existing_data.sql`
2. **Altere** estas linhas com seus dados reais:
   ```sql
   'Lanchonete Principal',  -- Nome da sua lanchonete
   'lanchonete-principal',  -- Slug (URL amigável)
   'Seu Nome',              -- Seu nome
   'seu@email.com',         -- Seu email
   '11999999999',           -- Seu telefone
   ```

3. Copie o arquivo **EDITADO**
4. Cole no SQL Editor do Supabase
5. Clique em **Run**
6. ✅ Verifique os logs (NOTICE messages)

**O que esta migration faz:**
- Cria um tenant padrão com seus dados existentes
- Associa todos os dados existentes a este tenant
- Conecta seu usuário ao tenant como OWNER

---

### **Passo 3: Tornar tenant_id Obrigatório**

Após confirmar que a migração funcionou:

1. Abra o SQL Editor
2. Execute estas queries para verificar:
   ```sql
   SELECT 'Tenants' as tabela, COUNT(*) as total FROM tenants
   UNION ALL
   SELECT 'Categories', COUNT(*) FROM categories WHERE tenant_id IS NOT NULL
   UNION ALL
   SELECT 'Products', COUNT(*) FROM products WHERE tenant_id IS NOT NULL
   UNION ALL
   SELECT 'Orders', COUNT(*) FROM orders WHERE tenant_id IS NOT NULL;
   ```

3. Se **todos** os dados tiverem `tenant_id`, execute:
   ```sql
   ALTER TABLE categories ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE order_items ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE notification_settings ALTER COLUMN tenant_id SET NOT NULL;
   ```

---

## ✅ Verificação

Execute estas queries para confirmar que tudo funcionou:

```sql
-- 1. Ver tenants criados
SELECT * FROM tenants;

-- 2. Ver usuários associados a tenants
SELECT 
  tu.role,
  t.business_name,
  au.email
FROM tenant_users tu
JOIN tenants t ON t.id = tu.tenant_id
JOIN auth.users au ON au.id = tu.user_id;

-- 3. Verificar se dados têm tenant_id
SELECT 
  (SELECT COUNT(*) FROM categories WHERE tenant_id IS NOT NULL) as categories,
  (SELECT COUNT(*) FROM products WHERE tenant_id IS NOT NULL) as products,
  (SELECT COUNT(*) FROM orders WHERE tenant_id IS NOT NULL) as orders;
```

---

## 🎯 Próximos Passos

Após executar as migrations com sucesso:

1. ✅ **Atualizar o código** para usar `tenant_id`
2. ✅ **Criar painel admin** para aprovar novos tenants
3. ✅ **Atualizar autenticação** para incluir tenant
4. ✅ **Criar rota dinâmica** `/cardapio/[slug]`
5. ✅ **Testar** com múltiplos tenants

---

## 🐛 Troubleshooting

### Erro: "column tenant_id does not exist"
**Solução:** Execute a migration 006 primeiro.

### Erro: "violates not-null constraint"
**Solução:** Execute a migration 007 para associar tenant_id aos dados existentes.

### Dados não aparecem após migration
**Solução:** 
1. Verifique se você está logado com o usuário correto
2. Execute: `SELECT * FROM tenant_users WHERE user_id = auth.uid();`
3. Confirme que seu user_id está associado a um tenant

### RLS bloqueando acesso
**Solução:**
1. Verifique as políticas: `SELECT * FROM pg_policies WHERE tablename = 'products';`
2. Confirme que seu usuário tem entrada em `tenant_users`

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Revise o passo a passo
3. Confirme que fez backup antes de começar
4. Se necessário, restaure o backup e tente novamente

---

## 🎉 Sucesso!

Se tudo funcionou, você agora tem:
- ✅ Sistema multi-tenant funcionando
- ✅ Dados isolados por lanchonete
- ✅ Base para crescer como SaaS
- ✅ Pronto para adicionar novos clientes

**Próximo passo:** Criar o painel admin para aprovar novos clientes!