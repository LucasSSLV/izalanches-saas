// app/api/orders/[id]/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = ['NOVO', 'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];

interface UpdateStatusRequest {
  status: OrderStatus;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  console.log(`🔥 API /api/orders/${orderId}/update-status chamada!`);

  try {
    const body: UpdateStatusRequest = await request.json();
    const newStatus = body.status;
    console.log(`📦 Body recebido:`, { newStatus });

    if (!newStatus || !STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Buscar o pedido para obter dados do cliente
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, status")
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
    console.log(`📝 Atualizando status do pedido ${orderId} para ${newStatus}...`);
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

    // 3. Verificar configurações de notificação
    console.log("🔍 Verificando configurações de notificação...");
    let settings;
    const { data: settingsData, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (settingsError || !settingsData || settingsData.length === 0) {
      console.warn(
        "⚠️  Aviso: Não foi possível buscar as configurações de notificação ou nenhuma configuração foi encontrada. As notificações de status não serão enviadas.",
        settingsError
      );
      // Define settings padrão para evitar que o resto da função quebre
      // Idealmente, a tabela deveria ter uma linha. Usando fallback com notificações ativadas.
      console.warn("Usando configurações de notificação padrão (fallback).");
      settings = {
        send_order_confirmation: true,
        send_preparation_notice: true,
        send_delivery_notice: true,
        send_completion_notice: true,
      };
    } else {
      settings = settingsData[0];
    }

    // 4. Determinar se a notificação deve ser enviada
    let message = "";
    const orderShortId = order.id.slice(0, 8).toUpperCase();

    switch (newStatus) {
      case "EM_PREPARACAO":
        if (settings.send_preparation_notice) {
          message = `👨‍🍳 *Pedido em Preparação - #${orderShortId}*

Olá ${order.customer_name}!

Seu pedido já está sendo preparado com muito carinho!

Logo mais ele sai para entrega.`;
        }
        break;
      case "SAIU_PARA_ENTREGA":
        if (settings.send_delivery_notice) {
          message = `🚚 *Pedido Saiu para Entrega - #${orderShortId}*

Olá ${order.customer_name}!

Seu pedido está a caminho! 🎉

Em breve estará aí. Aproveite! 🍔`;
        }
        break;
      case "CONCLUIDO":
        if (settings.send_completion_notice) {
          message = `🏁 *Pedido Concluído - #${orderShortId}*

Olá ${order.customer_name}!

Esperamos que tenha gostado!

Bom apetite e até a próxima! 🙏`;
        }
        break;
    }

    // 5. Enviar notificação se houver mensagem
    if (message) {
      try {
        console.log(`📱 Enviando notificação de status '${newStatus}'...`);
        const whatsappResponse = await fetch(
          `${request.nextUrl.origin}/api/twilio/send-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: order.customer_phone,
              message: message,
            }),
          }
        );

        if (!whatsappResponse.ok) {
          console.error("⚠️ Falha ao enviar WhatsApp para mudança de status");
        } else {
          console.log("✅ Notificação de status enviada com sucesso");
        }
      } catch (whatsappError) {
        console.error("⚠️ Erro ao enviar notificação de status:", whatsappError);
      }
    } else {
        console.log(`🚫 Envio de notificação para o status '${newStatus}' está desativado.`);
    }

    return NextResponse.json({ success: true, message: "Status do pedido atualizado com sucesso." });

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
