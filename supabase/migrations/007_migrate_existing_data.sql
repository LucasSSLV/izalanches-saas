-- supabase/migrations/007_migrate_existing_data.sql
-- Migration para migrar dados existentes para o modelo multi-tenant

-- ============================================================================
-- IMPORTANTE: Execute esta migration APENAS se você já tiver dados no banco!
-- Se estiver começando do zero, pode pular esta migration.
-- ============================================================================

DO $$
DECLARE
  default_tenant_id UUID;
  admin_user_id UUID;
BEGIN
  -- Verificar se já existem dados nas tabelas
  IF EXISTS (SELECT 1 FROM categories LIMIT 1) OR 
     EXISTS (SELECT 1 FROM products LIMIT 1) OR 
     EXISTS (SELECT 1 FROM orders LIMIT 1) THEN
    
    RAISE NOTICE 'Dados existentes encontrados. Iniciando migração...';
    
    -- ========================================================================
    -- 1. CRIAR TENANT PADRÃO PARA OS DADOS EXISTENTES
    -- ========================================================================
    
    INSERT INTO tenants (
      business_name,
      slug,
      owner_name,
      owner_email,
      owner_phone,
      status,
      plan
    ) VALUES (
      'Lanchonete-teste',  -- Altere para o nome da sua lanchonete
      'Teste-delivery',   -- Altere para o slug desejado
      'LucasSSLV',          -- Altere para seu nome
      'admin@lsslv.com',   -- Altere para seu email
      '88992414480',            -- Altere para seu telefone
      'ACTIVE',
      'PRO'
    )
    RETURNING id INTO default_tenant_id;
    
    RAISE NOTICE 'Tenant padrão criado com ID: %', default_tenant_id;
    
    -- ========================================================================
    -- 2. ASSOCIAR TENANT_ID A TODOS OS DADOS EXISTENTES
    -- ========================================================================
    
    -- Categories
    UPDATE categories 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Categorias atualizadas: % registros', (SELECT COUNT(*) FROM categories WHERE tenant_id = default_tenant_id);
    
    -- Products
    UPDATE products 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Produtos atualizados: % registros', (SELECT COUNT(*) FROM products WHERE tenant_id = default_tenant_id);
    
    -- Orders
    UPDATE orders 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Pedidos atualizados: % registros', (SELECT COUNT(*) FROM orders WHERE tenant_id = default_tenant_id);
    
    -- Order Items
    UPDATE order_items 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Itens de pedido atualizados: % registros', (SELECT COUNT(*) FROM order_items WHERE tenant_id = default_tenant_id);
    
    -- Notification Settings
    UPDATE notification_settings 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Configurações de notificação atualizadas: % registros', (SELECT COUNT(*) FROM notification_settings WHERE tenant_id = default_tenant_id);
    
    -- ========================================================================
    -- 3. ASSOCIAR USUÁRIO EXISTENTE AO TENANT (SE HOUVER)
    -- ========================================================================
    
    -- Pegar o primeiro usuário do sistema (provavelmente você)
    SELECT id INTO admin_user_id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (default_tenant_id, admin_user_id, 'OWNER')
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
      
      RAISE NOTICE 'Usuário % associado ao tenant como OWNER', admin_user_id;
    ELSE
      RAISE NOTICE 'Nenhum usuário encontrado no sistema';
    END IF;
    
    RAISE NOTICE 'Migração concluída com sucesso!';
    
  ELSE
    RAISE NOTICE 'Nenhum dado existente encontrado. Migração não necessária.';
  END IF;
END $$;

-- ============================================================================
-- 4. TORNAR tenant_id OBRIGATÓRIO (NOT NULL)
-- ============================================================================

-- Após migrar os dados, podemos tornar tenant_id obrigatório
-- Isso garante que nenhum dado futuro seja criado sem tenant

-- IMPORTANTE: Só descomente estas linhas DEPOIS de executar a migration acima
-- e confirmar que todos os dados têm tenant_id

-- ALTER TABLE categories ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE order_items ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE notification_settings ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================================
-- 5. VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================

-- Execute estas queries para verificar se tudo migrou corretamente:

-- SELECT 'Tenants' as tabela, COUNT(*) as total FROM tenants
-- UNION ALL
-- SELECT 'Categories', COUNT(*) FROM categories WHERE tenant_id IS NOT NULL
-- UNION ALL
-- SELECT 'Products', COUNT(*) FROM products WHERE tenant_id IS NOT NULL
-- UNION ALL
-- SELECT 'Orders', COUNT(*) FROM orders WHERE tenant_id IS NOT NULL
-- UNION ALL
-- SELECT 'Order Items', COUNT(*) FROM order_items WHERE tenant_id IS NOT NULL
-- UNION ALL
-- SELECT 'Notification Settings', COUNT(*) FROM notification_settings WHERE tenant_id IS NOT NULL
-- UNION ALL
-- SELECT 'Tenant Users', COUNT(*) FROM tenant_users;