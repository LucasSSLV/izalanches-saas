-- supabase/migrations/006_multi_tenant.sql
-- Migration para transformar o sistema em Multi-Tenant (SaaS)

-- ============================================================================
-- 1. CRIAR TABELA DE TENANTS (LANCHONETES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações do Negócio
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL amigável: /cardapio/slug-da-lanchonete
  
  -- Contato do Responsável
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL UNIQUE,
  owner_phone TEXT NOT NULL,
  
  -- Endereço
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Configurações
  logo_url TEXT,
  primary_color TEXT DEFAULT '#EF4444', -- Cor principal da marca
  whatsapp_number TEXT, -- Número para os clientes entrarem em contato
  
  -- Status da Conta
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED')),
  -- PENDING: Aguardando aprovação
  -- ACTIVE: Ativo e funcionando
  -- SUSPENDED: Suspenso (não paga, violação, etc)
  -- CANCELLED: Cancelado pelo cliente
  
  -- Plano e Pagamento (para futuro)
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'BASIC', 'PRO', 'ENTERPRISE')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  settings JSONB DEFAULT '{}'::jsonb, -- Configurações customizadas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON tenants(owner_email);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Converter para slug: "Lanchonete do João" -> "lanchonete-do-joao"
  base_slug := lower(trim(regexp_replace(
    -- Normaliza removendo acentos
    unaccent(business_name),
    '[^a-zA-Z0-9]+', '-', 'g'), '-'));
  final_slug := base_slug;
  
  -- Verificar se já existe e adicionar número se necessário
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE tenants IS 'Tabela de lanchonetes (tenants) do sistema SaaS';
COMMENT ON COLUMN tenants.slug IS 'Identificador único para URL: /cardapio/slug-da-lanchonete';
COMMENT ON COLUMN tenants.status IS 'Status da conta: PENDING (aguardando), ACTIVE (ativo), SUSPENDED (suspenso), CANCELLED (cancelado)';

-- ============================================================================
-- 2. ADICIONAR tenant_id EM TODAS AS TABELAS EXISTENTES
-- ============================================================================

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);

-- Order Items não precisa de tenant_id direto (herda do order)
-- Mas vamos adicionar para facilitar queries
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id);

-- Notification Settings
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON notification_settings(tenant_id);

-- Contact Leads não precisa de tenant_id (são leads globais para o admin)

-- ============================================================================
-- 3. CRIAR TABELA DE USUÁRIOS POR TENANT
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permissões
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  -- OWNER: Dono da lanchonete (criador)
  -- ADMIN: Gerente (pode tudo exceto deletar a conta)
  -- MEMBER: Atendente (acesso limitado)
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  
  -- Constraint: Um usuário não pode estar duplicado no mesmo tenant
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);

COMMENT ON TABLE tenant_users IS 'Relacionamento entre usuários e tenants (lanchonetes)';
COMMENT ON COLUMN tenant_users.role IS 'OWNER (dono), ADMIN (gerente), MEMBER (atendente)';

-- ============================================================================
-- 4. ATUALIZAR POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- ============================================================================
-- 4.1 TENANTS
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver apenas seus próprios tenants
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Usuários podem atualizar apenas seus próprios tenants (se forem OWNER ou ADMIN)
DROP POLICY IF EXISTS "Owners and admins can update their tenant" ON tenants;
CREATE POLICY "Owners and admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- 4.2 CATEGORIES
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Public can read categories" ON categories;
DROP POLICY IF EXISTS "Authenticated can manage categories" ON categories;

-- Público pode ver categorias de tenants ativos
DROP POLICY IF EXISTS "Public can view categories from active tenants" ON categories;
CREATE POLICY "Public can view categories from active tenants"
  ON categories FOR SELECT
  USING (
    tenant_id IN (SELECT id FROM tenants WHERE status = 'ACTIVE')
  );

-- Usuários podem gerenciar categorias do seu tenant
DROP POLICY IF EXISTS "Users can manage their tenant categories" ON categories;
CREATE POLICY "Users can manage their tenant categories"
  ON categories FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 4.3 PRODUCTS
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Public can read available products" ON products;
DROP POLICY IF EXISTS "Authenticated can manage products" ON products;

-- Público pode ver produtos disponíveis de tenants ativos
DROP POLICY IF EXISTS "Public can view available products from active tenants" ON products;
CREATE POLICY "Public can view available products from active tenants"
  ON products FOR SELECT
  USING (
    available = true 
    AND tenant_id IN (SELECT id FROM tenants WHERE status = 'ACTIVE')
  );

-- Usuários podem gerenciar produtos do seu tenant
DROP POLICY IF EXISTS "Users can manage their tenant products" ON products;
CREATE POLICY "Users can manage their tenant products"
  ON products FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 4.4 ORDERS
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated can manage orders" ON orders;

-- Público pode criar pedidos para tenants ativos
DROP POLICY IF EXISTS "Public can create orders for active tenants" ON orders;
CREATE POLICY "Public can create orders for active tenants"
  ON orders FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE status = 'ACTIVE')
  );

-- Usuários podem gerenciar pedidos do seu tenant
DROP POLICY IF EXISTS "Users can manage their tenant orders" ON orders;
CREATE POLICY "Users can manage their tenant orders"
  ON orders FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 4.5 ORDER_ITEMS
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated can manage order_items" ON order_items;

-- Público pode criar itens para pedidos de tenants ativos
DROP POLICY IF EXISTS "Public can create order items for active tenants" ON order_items;
CREATE POLICY "Public can create order items for active tenants"
  ON order_items FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE status = 'ACTIVE')
  );

-- Usuários podem gerenciar itens de pedidos do seu tenant
DROP POLICY IF EXISTS "Users can manage their tenant order items" ON order_items;
CREATE POLICY "Users can manage their tenant order items"
  ON order_items FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 4.6 NOTIFICATION_SETTINGS
-- ============================================================================

-- Usuários podem gerenciar configurações do seu tenant
DROP POLICY IF EXISTS "Users can manage their tenant notification settings" ON notification_settings;
CREATE POLICY "Users can manage their tenant notification settings"
  ON notification_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 4.7 TENANT_USERS
-- ============================================================================

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver membros do seu tenant
DROP POLICY IF EXISTS "Users can view their tenant members" ON tenant_users;
CREATE POLICY "Users can view their tenant members"
  ON tenant_users FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Apenas OWNERS e ADMINS podem convidar novos membros
DROP POLICY IF EXISTS "Owners and admins can invite members" ON tenant_users;
CREATE POLICY "Owners and admins can invite members"
  ON tenant_users FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- 5. FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para obter o tenant_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
      AND is_active = true 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem permissão em um tenant
CREATE OR REPLACE FUNCTION user_has_tenant_access(check_tenant_id UUID, required_role TEXT DEFAULT 'MEMBER')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = check_tenant_id
      AND is_active = true
      AND CASE required_role
        WHEN 'OWNER' THEN role = 'OWNER'
        WHEN 'ADMIN' THEN role IN ('OWNER', 'ADMIN')
        ELSE TRUE
      END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. DADOS INICIAIS (OPCIONAL - para testes)
-- ============================================================================

-- Se você quiser criar um tenant de exemplo para testar:
-- INSERT INTO tenants (business_name, slug, owner_name, owner_email, owner_phone, status)
-- VALUES ('Lanchonete Teste', 'lanchonete-teste', 'Admin', 'admin@teste.com', '11999999999', 'ACTIVE');

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Esta migração reforça a segurança, garantindo que apenas usuários de tenants ativos possam acessar ou modificar dados.

-- Para aplicar esta migration:
-- 1. Copie todo este código
-- 2. Cole no SQL Editor do Supabase
-- 3. Execute
-- 4. Verifique os logs para confirmar sucesso