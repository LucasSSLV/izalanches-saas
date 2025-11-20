-- Insert default notification settings, enabling all status change notifications.
INSERT INTO public.notification_settings (
  send_order_confirmation,
  send_preparation_notice,
  send_delivery_notice,
  send_completion_notice
) VALUES (
  true,
  true,
  true,
  true
);
