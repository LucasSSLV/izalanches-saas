// lib/notifications/whatsapp.ts
import { sendWhatsAppTemplate } from "@/lib/twilio/client";

export interface NotificationConfig {
  sendOrderConfirmation: boolean;
  sendPreparationNotice: boolean;
  sendDeliveryNotice: boolean;
  sendCompletionNotice: boolean;
}

export const DEFAULT_CONFIG: NotificationConfig = {
  sendOrderConfirmation: true,
  sendPreparationNotice: true,
  sendDeliveryNotice: true,
  sendCompletionNotice: true,
};

const WHATSAPP_TEMPLATES = {
  sendOrderConfirmation: {
    contentSid: process.env.TWILIO_ORDER_CONFIRMATION_SID,
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
      "3": data.total.toFixed(2),
      "4": data.paymentMethod,
    }),
  },
  sendPreparationNotice: {
    contentSid: process.env.TWILIO_ORDER_STATUS_PREPARING_SID,
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
    }),
  },
  sendDeliveryNotice: {
    contentSid: process.env.TWILIO_ORDER_STATUS_OUT_FOR_DELIVERY_SID,
    getVariables: (data: any) => ({
      "1": data.customerName,
      "2": data.orderId.slice(0, 8).toUpperCase(),
    }),
  },
  sendCompletionNotice: {
    contentSid: process.env.TWILIO_ORDER_STATUS_COMPLETED_SID,
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
  console.log(`\n🔔 ========== INICIANDO ENVIO DE NOTIFICAÇÃO ==========`);
  console.log(`   Tipo: ${type}`);
  console.log(`   Telefone: ${phone}`);
  console.log(`   Dados:`, data);

  // 1. Verificar se o tipo de notificação está habilitado
  if (!DEFAULT_CONFIG[type]) {
    console.log(
      `⏭️ Skipping notification: '${type}' is disabled for cost savings.`
    );
    return null;
  }

  // 2. Obter o template e as variáveis corretas
  const templateConfig = WHATSAPP_TEMPLATES[type];
  if (!templateConfig) {
    console.error(`❌ Error: WhatsApp template for '${type}' not found.`);
    return null;
  }

  const contentSid = templateConfig.contentSid;

  console.log(`📋 ContentSid obtido: "${contentSid}"`);
  console.log(`   Tipo: ${typeof contentSid}`);
  console.log(`   Definido: ${contentSid ? "SIM" : "NÃO"}`);

  // VERIFICAÇÃO IMPORTANTE: Checar se o contentSid está definido
  if (!contentSid) {
    console.error(
      `❌ Error: ContentSid for '${type}' is undefined. Check your environment variables.`
    );
    return null;
  }

  const contentVariables = templateConfig.getVariables(data);

  console.log(`📤 Preparando envio de notificação:`);
  console.log(`   ContentSid: ${contentSid}`);
  console.log(`   Variables:`, JSON.stringify(contentVariables, null, 2));

  try {
    // 3. Chamar o Twilio diretamente
    const result = await sendWhatsAppTemplate({
      to: phone,
      contentSid,
      contentVariables,
    });

    console.log(`✅ Template notification '${type}' sent to ${phone}`);
    console.log(`✅ Result:`, JSON.stringify(result, null, 2));
    console.log(`========== FIM DO ENVIO DE NOTIFICAÇÃO ==========\n`);
    return result;
  } catch (error) {
    console.error(`❌ Error sending template '${type}':`, error);
    if (error instanceof Error) {
      console.error(`❌ Error message:`, error.message);
    }
    console.log(`========== ERRO NO ENVIO DE NOTIFICAÇÃO ==========\n`);
    return null;
  }
}

export function calculateEstimatedTime(
  orderType: "ENTREGA" | "RETIRADA"
): string {
  return orderType === "ENTREGA" ? "40-50 minutos" : "20-30 minutos";
}

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
  const MESSAGE_COST = 0.005;

  const messagesWithAll = monthlyOrders * 4;
  const costWithAll = messagesWithAll * MESSAGE_COST;

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
