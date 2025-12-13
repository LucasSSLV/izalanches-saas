-- supabase/seed.sql
-- Este script popula o banco de dados com um tenant e usuário admin iniciais.
-- É executado automaticamente após 'supabase db reset'.

DO $$
DECLARE
  admin_user_id uuid;
  admin_tenant_id uuid;
  admin_tenant_name TEXT := 'Administração PedeAqui';
  admin_user_email TEXT := 'lsslv_dev@hotmail.com';
BEGIN
  -- 1. Criar o usuário admin no sistema de autenticação do Supabase.
  --    A senha padrão é 'password123'. É ALTAMENTE RECOMENDADO
  --    alterá-la no primeiro login ou usando o fluxo de "esqueci a senha".
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, email_change_token_current,
    email_change_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', admin_user_email,
    crypt('password123', gen_salt('bf')), NOW(), '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
    '', '', '', '', NULL
  ) RETURNING id INTO admin_user_id;

  -- 2. Criar o tenant (a lanchonete) para o admin.
  INSERT INTO public.tenants (
    id, business_name, slug, owner_name, owner_email, owner_phone,
    status, approved_at, approved_by
  ) VALUES (
    gen_random_uuid(),
    admin_tenant_name,
    generate_unique_slug(admin_tenant_name),
    'Admin PedeAqui', -- Nome do dono
    admin_user_email,
    '99999999999', -- Telefone do dono
    'ACTIVE', -- Status ativo
    NOW(),
    admin_user_id
  ) RETURNING id INTO admin_tenant_id;

  -- 3. Vincular o usuário admin ao tenant com a permissão de 'OWNER'.
  INSERT INTO public.tenant_users (
    tenant_id, user_id, role, is_active
  ) VALUES (
    admin_tenant_id, admin_user_id, 'OWNER', true
  );

END $$;
