-- supabase/migrations/005_contact_leads.sql

-- Criar tabela para armazenar leads/contatos da landing page
CREATE TABLE
IF
  NOT EXISTS contact_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    , name TEXT NOT NULL
    , business_name TEXT NOT NULL
    , phone TEXT NOT NULL
    , email TEXT NOT NULL
    , message TEXT
    , status TEXT NOT NULL DEFAULT 'NOVO' CHECK (
      status IN ('NOVO', 'EM_CONTATO', 'CONVERTIDO', 'PERDIDO')
    )
    , notes TEXT
    , created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    , updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Índices para performance
  CREATE INDEX
  IF
    NOT EXISTS idx_contact_leads_status
    ON contact_leads(status);
    CREATE INDEX
    IF
      NOT EXISTS idx_contact_leads_created_at
      ON contact_leads(created_at);
      CREATE INDEX
      IF
        NOT EXISTS idx_contact_leads_email
        ON contact_leads(email);

        -- Trigger para atualizar updated_at
        DROP TRIGGER
        IF
          EXISTS update_contact_leads_updated_at
          ON contact_leads;
          CREATE TRIGGER update_contact_leads_updated_at
          BEFORE UPDATE
          ON contact_leads
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

          -- RLS (Row Level Security)
          ALTER TABLE contact_leads
          ENABLE ROW LEVEL
          SECURITY;

          -- Política: Apenas autenticados podem ver e gerenciar leads
          DROP POLICY
          IF
            EXISTS "Authenticated can view contact leads"
            ON contact_leads;
            CREATE POLICY "Authenticated can view contact leads"
            ON contact_leads
            FOR
            SELECT
            USING (auth.role() = 'authenticated');

            DROP POLICY
            IF
              EXISTS "Authenticated can manage contact leads"
              ON contact_leads;
              CREATE POLICY "Authenticated can manage contact leads"
              ON contact_leads
              FOR ALL
              USING (auth.role() = 'authenticated');

              -- Política: Permitir inserção pública (para o formulário da landing page)
              DROP POLICY
              IF
                EXISTS "Public can create contact leads"
                ON contact_leads;
                CREATE POLICY "Public can create contact leads"
                ON contact_leads
                FOR INSERT
                WITH CHECK (true);

                -- Comentários explicativos
                COMMENT ON TABLE contact_leads IS 'Armazena leads/contatos vindos do formulário da landing page';
                COMMENT ON COLUMN contact_leads.status IS 'Status do lead: NOVO, EM_CONTATO, CONVERTIDO, PERDIDO';
                COMMENT ON COLUMN contact_leads.notes IS 'Notas internas sobre o acompanhamento do lead';