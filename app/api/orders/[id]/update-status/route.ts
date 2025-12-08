// app/api/orders/[id]/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OrderStatus } from "@/types";
import {
  sendOrderNotification,
  NotificationConfig,
  DEFAULT_CONFIG,
} from "@/lib/notifications/whatsapp";

const STATUSES: OrderStatus[] = [
  "NOVO",
  "EM_PREPARACAO",
  "SAIU_PARA_ENTREGA",
  "CONCLUIDO",
];

interface UpdateStatusRequest {
  status: OrderStatus;
}

/**
 * Busca a configuração de notificações do banco de dados.
 */
async function getNotificationConfig(): Promise<NotificationConfig> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .single();

    if (error || !data) {
      console.log("⚙️ Usando configuração padrão (não encontrada no banco)");
      return DEFAULT_CONFIG;
    }

    console.log("⚙️ Configuração carregada do banco:", data);
    
    return {
      sendOrderConfirmation: data.send_order_confirmation ?? DEFAULT_CONFIG.sendOrderConfirmation,
      sendPreparationNotice: data.send_preparation_notice ?? DEFAULT_CONFIG.sendPreparationNotice,
      sendDeliveryNotice: data.send_delivery_notice ?? DEFAULT_CONFIG.sendDeliveryNotice,
      sendCompletionNotice: data.send_completion_notice ?? DEFAULT_CONFIG.sendCompletionNotice,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar configuração de notificações:", error);
    return DEFAULT_CONFIG;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    console.log(`🔥 API /api/orders/${orderId}/update-status chamada!`);

    const body: UpdateStatusRequest = await request.json();
    const { status: newStatus } = body;
    console.log(`📦 Body recebido:`, { newStatus });

    if (!newStatus || !STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Buscar o pedido para obter todos os dados necessários
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, status, total, payment_method"
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Se o status não mudou, não fazer nada
    if (order.status === newStatus) {
      return NextResponse.json({ message: "Status do pedido não alterado." });
    }

    // 2. Atualizar o status do pedido
    console.log(
      `📝 Atualizando status do pedido ${orderId} para ${newStatus}...`
    );
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("❌ Erro ao atualizar status:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar status do pedido" },
        { status: 500 }
      );
    }
    console.log("✅ Status do pedido atualizado com sucesso.");

    // 3. Buscar configurações de notificação
    const notificationConfig = await getNotificationConfig();

    // 4. Enviar notificação de mudança de status usando o template correto
    const statusToNotificationType: {
      [key in OrderStatus]?: keyof NotificationConfig;
    } = {
      EM_PREPARACAO: "sendPreparationNotice",
      SAIU_PARA_ENTREGA: "sendDeliveryNotice",
      CONCLUIDO: "sendCompletionNotice",
    };

    const notificationType = statusToNotificationType[newStatus];

    if (notificationType) {
      console.log(
        `📱 Disparando notificação de template para o status '${newStatus}'...`
      );
      await sendOrderNotification(
        order.customer_phone,
        notificationType,
        {
          orderId: order.id,
          customerName: order.customer_name,
          total: order.total,
          paymentMethod: order.payment_method,
        },
        notificationConfig // <- Passa a config do banco
      );
    } else {
      console.log(
        `ℹ️ Nenhuma notificação por template configurada para o status '${newStatus}'.`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Status do pedido atualizado com sucesso.",
    });
  } catch (error) {
    console.error("❌ Erro geral ao atualizar status do pedido:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}