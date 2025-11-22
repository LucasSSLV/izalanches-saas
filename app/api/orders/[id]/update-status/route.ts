// app/api/orders/[id]/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OrderStatus } from "@/types";
import {
  sendOrderNotification,
  NotificationConfig,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/");
    const orderId = segments[3];
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

    // 3. Enviar notificação de mudança de status usando o template correto
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
      // A função sendOrderNotification já verifica internamente se a notificação
      // está habilitada nas configurações, então não precisamos de um 'if' aqui.
      await sendOrderNotification(order.customer_phone, notificationType, {
        orderId: order.id,
        customerName: order.customer_name,
        total: order.total,
        paymentMethod: order.payment_method,
      });
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
