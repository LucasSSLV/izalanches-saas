// lib/notifications/whatsapp.ts

export interface NotificationConfig {
  sendOrderConfirmation: boolean; // ✅ Pedido recebido
  sendPreparationNotice: boolean; // 🧑‍🍳 Em preparo
  sendDeliveryNotice: boolean; // 🚚 Saiu para entrega
  sendCompletionNotice: boolean; // ✅ Concluído (opcional)
}

// Configuração padrão (recomendada para economia)
export const DEFAULT_CONFIG: NotificationConfig = {
  sendOrderConfirmation: true, // ESSENCIAL - cliente sabe que pedido foi recebido
  sendPreparationNotice: false, // OPCIONAL - pode economizar
  sendDeliveryNotice: true, // ESSENCIAL - cliente sabe que está a caminho
  sendCompletionNotice: false, // OPCIONAL - só se for retirada
};

const WHATSAPP_TEMPLATES = {
  sendOrderConfirmation: {
    // Exemplo de corpo do template:
    // Olá {{1}}! Seu pedido #{{2}} foi recebido. Total: R$ {{3}}. Pagamento: {{4}}.
    contentSid: process.env.TWILIO_ORDER_CONFIRMATION_SID, // <-- SUBSTITUIR
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
      "3": data.total.toFixed(2),
      "4": data.paymentMethod,
    }),
  },
  sendPreparationNotice: {
    // Exemplo: Olá {{1}}! Seu pedido #{{2}} já está em preparo.
    contentSid: process.env.TWILIO_ORDER_STATUS_PREPARING_SID, // <-- SUBSTITUIR
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
    }),
  },
  sendDeliveryNotice: {
    // Exemplo: Olá {{1}}! Seu pedido #{{2}} saiu para entrega.
    contentSid: process.env.TWILIO_ORDER_STATUS_OUT_FOR_DELIVERY_SID, // <-- SUBSTITUIR
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
    }),
  },
  sendCompletionNotice: {
    // Exemplo: Olá {{1}}! Seu pedido #{{2}} está pronto para retirada.
    contentSid: process.env.TWILIO_ORDER_STATUS_COMPLETED_SID, // <-- SUBSTITUIR
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
    }),
  },
};

export async function sendOrderNotification(
  phone: string,
  type: keyof NotificationConfig,
  data: {
    orderId: string;
    customerName: string;
    total: number;
    paymentMethod: string;
    estimatedTime?: string;
  }
) {
  // 1. Verificar se o tipo de notificação está habilitado
  if (!DEFAULT_CONFIG[type]) {
    console.log(
      `Skipping notification: '${type}' is disabled for cost savings.`
    );
    return null;
  }

  // 2. Obter o template e as variáveis corretas
  const templateConfig = WHATSAPP_TEMPLATES[type];
  if (!templateConfig) {
    console.error(`Error: WhatsApp template for '${type}' not found.`);
    return null;
  }

  const contentSid = templateConfig.contentSid;
  const contentVariables = templateConfig.getVariables(data);

  try {
    // 3. Enviar para a API usando o formato de template
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const url = new URL("/api/twilio/send-message", domain);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        template: {
          contentSid,
          contentVariables,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `Failed to send notification: ${errorBody.error || response.statusText}`
      );
    }

    console.log(`✅ Template notification '${type}' sent to ${phone}`);
    return await response.json();
  } catch (error) {
    console.error(`❌ Error sending template '${type}':`, error);
    return null;
  }
}

// Função auxiliar para calcular tempo estimado
export function calculateEstimatedTime(
  orderType: "ENTREGA" | "RETIRADA"
): string {
  return orderType === "ENTREGA" ? "40-50 minutos" : "20-30 minutos";
}

// Estatísticas de economia
export function calculateMonthlySavings(
  monthlyOrders: number,
  currentConfig: NotificationConfig = DEFAULT_CONFIG
): {
  messagesWithAll: number;
  messagesWithConfig: number;
  costWithAll: number;
  costWithConfig: number;
  savings: number;
} {
  const MESSAGE_COST = 0.005; // USD por mensagem

  // Cenário: todas notificações ativas
  const messagesWithAll = monthlyOrders * 4; // confirmação + preparo + entrega + conclusão
  const costWithAll = messagesWithAll * MESSAGE_COST;

  // Cenário: config otimizada
  let messagesPerOrder = 0;
  if (currentConfig.sendOrderConfirmation) messagesPerOrder++;
  if (currentConfig.sendPreparationNotice) messagesPerOrder++;
  if (currentConfig.sendDeliveryNotice) messagesPerOrder++;
  if (currentConfig.sendCompletionNotice) messagesPerOrder++;

  const messagesWithConfig = monthlyOrders * messagesPerOrder;
  const costWithConfig = messagesWithConfig * MESSAGE_COST;

  return {
    messagesWithAll,
    messagesWithConfig,
    costWithAll,
    costWithConfig,
    savings: costWithAll - costWithConfig,
  };
}

// Exemplo de uso:
// const stats = calculateMonthlySavings(3000); // 3000 pedidos/mês
// console.log(`Economia mensal: $${stats.savings.toFixed(2)}`);
