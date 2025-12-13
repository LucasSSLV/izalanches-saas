-- supabase/migrations/009_enforce_tenant_status_in_rls.sql
-- Migration para reforçar a verificação do status do tenant nas políticas RLS.
-- Isso impede que usuários de tenants com status 'SUSPENDED' ou 'CANCELLED' acessem os dados.

-- ============================================================================
-- 1. FUNÇÃO AUXILIAR PARA PEGAR O tenant_id ATIVO DO USUÁRIO
-- ============================================================================
-- Esta função retorna o tenant_id do usuário apenas se o tenant estiver ATIVO.
-- Isso simplifica as políticas RLS.

CREATE OR REPLACE FUNCTION get_active_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  active_tenant_id UUID;
BEGIN
  SELECT tu.tenant_id INTO active_tenant_id
  FROM tenant_users tu
  JOIN tenants t ON tu.tenant_id = t.id
  WHERE tu.user_id = auth.uid()
    AND tu.is_active = true
    AND t.status = 'ACTIVE'
  LIMIT 1;
  
  RETURN active_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. ATUALIZAR POLÍTICAS RLS EXISTENTES
-- ============================================================================

-- ============================================================================
-- 2.1 TENANTS
-- ============================================================================

-- A política "Users can view their tenants" precisa ser atualizada para
-- verificar o status do tenant. Um usuário só pode ver/gerenciar seu tenant se estiver ativo.
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  USING (id = get_active_user_tenant_id());

-- A política de UPDATE também precisa ser reforçada.
DROP POLICY IF EXISTS "Owners and admins can update their tenant" ON tenants;
CREATE POLICY "Owners and admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id = get_active_user_tenant_id()
    AND id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- 2.2 CATEGORIES
-- ============================================================================

-- Substitui a política antiga pela nova, mais segura.
DROP POLICY IF EXISTS "Users can manage their tenant categories" ON categories;
CREATE POLICY "Users can manage their tenant categories"
  ON categories FOR ALL
  USING (tenant_id = get_active_user_tenant_id());

-- ============================================================================
-- 2.3 PRODUCTS
-- ============================================================================

-- Substitui a política antiga pela nova, mais segura.
DROP POLICY IF EXISTS "Users can manage their tenant products" ON products;
CREATE POLICY "Users can manage their tenant products"
  ON products FOR ALL
  USING (tenant_id = get_active_user_tenant_id());

-- ============================================================================
-- 2.4 ORDERS
-- ============================================================================

-- Substitui a política antiga pela nova, mais segura.
DROP POLICY IF EXISTS "Users can manage their tenant orders" ON orders;
CREATE POLICY "Users can manage their tenant orders"
  ON orders FOR ALL
  USING (tenant_id = get_active_user_tenant_id());


-- ============================================================================
-- 2.5 ORDER_ITEMS
-- ============================================================================

-- Substitui a política antiga pela nova, mais segura.
DROP POLICY IF EXISTS "Users can manage their tenant order items" ON order_items;
CREATE POLICY "Users can manage their tenant order items"
  ON order_items FOR ALL
  USING (tenant_id = get_active_user_tenant_id());

-- ============================================================================
-- 2.6 NOTIFICATION_SETTINGS
-- ============================================================================

-- Substitui a política antiga pela nova, mais segura.
DROP POLICY IF EXISTS "Users can manage their tenant notification settings" ON notification_settings;
CREATE POLICY "Users can manage their tenant notification settings"
  ON notification_settings FOR ALL
  USING (tenant_id = get_active_user_tenant_id());

-- ============================================================================
-- 2.7 TENANT_USERS
-- ============================================================================

-- Usuários só podem ver outros membros se o próprio tenant estiver ativo.
DROP POLICY IF EXISTS "Users can view their tenant members" ON tenant_users;
CREATE POLICY "Users can view their tenant members"
  ON tenant_users FOR SELECT
  USING (tenant_id = get_active_user_tenant_id());

-- Apenas OWNERS e ADMINS de tenants ativos podem convidar/gerenciar membros.
DROP POLICY IF EXISTS "Owners and admins can invite members" ON tenant_users;
CREATE POLICY "Owners and admins can invite members"
  ON tenant_users FOR INSERT
  WITH CHECK (
    tenant_id = get_active_user_tenant_id()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );


-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

COMMENT ON FUNCTION get_active_user_tenant_id IS 'Retorna o tenant_id do usuário, mas apenas se o tenant estiver com status ATIVO.';
