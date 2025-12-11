-- supabase/migrations/008_admin_rls_policies.sql
-- Migration para adicionar políticas de segurança para o Super Admin

-- ============================================================================
-- 1. FUNÇÃO AUXILIAR PARA VERIFICAR SE O USUÁRIO É ADMIN
-- ============================================================================
-- Esta função verifica se o email do usuário autenticado corresponde ao
-- email do admin definido nas variáveis de ambiente do Supabase.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- IMPORTANTE: Vá para a seção "SQL Editor" no seu painel Supabase
  -- e crie um novo segredo chamado ADMIN_EMAIL com o seu email de admin.
  -- Ex: 'seu-email-admin@example.com'
  RETURN auth.email() = (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_EMAIL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. ATUALIZAR POLÍTICAS RLS (ROW LEVEL SECURITY) PARA O ADMIN
-- ============================================================================

-- ============================================================================
-- 2.1 TABELA tenants
-- ============================================================================

-- Permite que o admin veja TODOS os tenants, ignorando as políticas existentes.
DROP POLICY IF EXISTS "Admin can view all tenants" ON tenants;
CREATE POLICY "Admin can view all tenants"
  ON tenants FOR SELECT
  USING (is_admin());

-- Permite que o admin atualize TODOS os tenants.
DROP POLICY IF EXISTS "Admin can update all tenants" ON tenants;
CREATE POLICY "Admin can update all tenants"
  ON tenants FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Permite que o admin insira novos tenants.
DROP POLICY IF EXISTS "Admin can insert tenants" ON tenants;
CREATE POLICY "Admin can insert tenants"
  ON tenants FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================================
-- 2.2 TABELA contact_leads
-- ============================================================================

-- Habilitar RLS na tabela de leads, se ainda não estiver habilitada.
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

-- Permite que o admin gerencie TODOS os leads de contato.
DROP POLICY IF EXISTS "Admin can manage all contact leads" ON contact_leads;
CREATE POLICY "Admin can manage all contact leads"
  ON contact_leads FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Permite que o formulário de contato público crie novos leads.
-- Esta política é necessária para que o formulário no seu site funcione.
DROP POLICY IF EXISTS "Public can create contact leads" ON contact_leads;
CREATE POLICY "Public can create contact leads"
  ON contact_leads FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

COMMENT ON FUNCTION is_admin IS 'Verifica se o usuário logado é o Super Admin com base no email.';
COMMENT ON POLICY "Admin can view all tenants" ON tenants IS 'Garante que o Super Admin possa ver todos os tenants no sistema.';
COMMENT ON POLICY "Admin can manage all contact leads" ON contact_leads IS 'Garante que o Super Admin possa ver e gerenciar todos os leads do formulário de contato.';
