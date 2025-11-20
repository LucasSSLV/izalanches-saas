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
  // Verificar se tipo de notificação está habilitado
  if (!DEFAULT_CONFIG[type]) {
    console.log(`Notificação ${type} desabilitada (economia de custos)`);
    return null;
  }

  const messages = {
    sendOrderConfirmation: `✅ *Pedido Recebido - #${data.orderId.slice(0, 8)}*

Olá ${data.customerName}!

Seu pedido foi confirmado com sucesso! 🍔

📋 *Resumo:*
💰 Total: R$ ${data.total.toFixed(2)}
💳 Pagamento: ${data.paymentMethod}
${data.estimatedTime ? `⏱️ Tempo estimado: ${data.estimatedTime}` : ""}

Você receberá uma notificação quando seu pedido sair para entrega.

🙏 Obrigado pela preferência!`,

    sendPreparationNotice: `🧑‍🍳 *Pedido em Preparo - #${data.orderId.slice(
      0,
      8
    )}*

Olá ${data.customerName}!

Estamos preparando seu pedido com todo carinho! 

Em breve você receberá mais atualizações.`,

    sendDeliveryNotice: `🚚 *Pedido Saiu para Entrega - #${data.orderId.slice(
      0,
      8
    )}*

Olá ${data.customerName}!

Seu pedido saiu para entrega! 🎉

Em breve estará aí.

Aproveite! 🍔`,

    sendCompletionNotice: `✅ *Pedido Pronto para Retirada - #${data.orderId.slice(
      0,
      8
    )}*

Olá ${data.customerName}!

Seu pedido está pronto! 

Pode vir buscar quando quiser.

Te esperamos! 😊`,
  };

  try {
    const response = await fetch("/api/twilio/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        message: messages[type],
      }),
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar notificação");
    }

    console.log(`✅ Notificação ${type} enviada para ${phone}`);
    return await response.json();
  } catch (error) {
    console.error(`❌ Erro ao enviar ${type}:`, error);
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
