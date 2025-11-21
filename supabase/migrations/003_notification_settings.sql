-- supabase/migrations/003_notification_settings.sql

-- Criar tabela de configurações de notificação
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_order_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  send_preparation_notice BOOLEAN NOT NULL DEFAULT FALSE,
  send_delivery_notice BOOLEAN NOT NULL DEFAULT TRUE,
  send_completion_notice BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Todos podem ler, apenas autenticados podem modificar
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read notification settings" ON notification_settings;
CREATE POLICY "Public can read notification settings" 
  ON notification_settings 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage notification settings" ON notification_settings;
CREATE POLICY "Authenticated can manage notification settings" 
  ON notification_settings 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Inserir configuração padrão (recomendada para economia)
INSERT INTO notification_settings (
  send_order_confirmation,
  send_preparation_notice,
  send_delivery_notice,
  send_completion_notice
) VALUES (
  true,   -- Confirmação de pedido: ESSENCIAL
  false,  -- Em preparo: DESATIVADO (economia)
  true,   -- Saiu para entrega: ESSENCIAL
  false   -- Concluído: DESATIVADO (economia)
)
ON CONFLICT DO NOTHING;

-- Comentários explicativos
COMMENT ON TABLE notification_settings IS 'Configurações de notificações WhatsApp para economia de custos';
COMMENT ON COLUMN notification_settings.send_order_confirmation IS 'RECOMENDADO: Cliente precisa saber que pedido foi recebido';
COMMENT ON COLUMN notification_settings.send_preparation_notice IS 'OPCIONAL: Economize desativando';
COMMENT ON COLUMN notification_settings.send_delivery_notice IS 'RECOMENDADO: Cliente precisa se preparar para receber';
COMMENT ON COLUMN notification_settings.send_completion_notice IS 'OPCIONAL: Use apenas para retirada no local';