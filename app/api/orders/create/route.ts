// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: "PIX" | "DINHEIRO";
  changeAmount?: number;
}

export async function POST(request: NextRequest) {
  console.log("🔥 API /api/orders/create chamada!");

  try {
    const body: CreateOrderRequest = await request.json();
    console.log("📦 Body recebido:", body);

    // Validação básica
    if (
      !body.customerName ||
      !body.customerPhone ||
      !body.items ||
      body.items.length === 0
    ) {
      console.log("❌ Validação falhou: dados incompletos");
      return NextResponse.json(
        { error: "Nome, telefone e itens são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar formato do telefone (básico)
    const phoneClean = body.customerPhone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      console.log("❌ Telefone inválido:", phoneClean);
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    console.log("✅ Validação OK, criando cliente Supabase...");
    const supabase = await createClient();

    // 1. Criar o pedido
    console.log("📝 Inserindo pedido no banco...");
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: body.customerName,
        customer_phone: phoneClean,
        customer_address: body.customerAddress || null,
        total: body.total,
        payment_method: body.paymentMethod,
        change_amount: body.changeAmount || null,
        status: "NOVO",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("❌ Erro ao criar pedido:", orderError);
      return NextResponse.json(
        { error: "Erro ao criar pedido no banco de dados" },
        { status: 500 }
      );
    }

    console.log("✅ Pedido criado:", order.id);

    // 2. Criar os itens do pedido
    console.log("📝 Inserindo itens do pedido...");
    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("❌ Erro ao criar itens do pedido:", itemsError);

      // Rollback: deletar o pedido criado
      console.log("🔄 Fazendo rollback...");
      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        { error: "Erro ao criar itens do pedido" },
        { status: 500 }
      );
    }

    console.log("✅ Itens criados com sucesso");

    // 3. Verificar configurações de notificação
    console.log("🔍 Verificando configurações de notificação...");
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("send_order_confirmation")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (settingsError) {
      console.warn(
        "⚠️  Aviso: Não foi possível buscar as configurações de notificação. A notificação de confirmação será enviada por padrão.",
        settingsError
      );
    }

    const shouldSendConfirmation = settings?.send_order_confirmation ?? true;

    // 4. Enviar notificação de confirmação via WhatsApp se ativado
    if (shouldSendConfirmation) {
      try {
        console.log("📱 Enviando notificação WhatsApp...");
        const estimatedTime = "40-50 minutos";
        const message = `✅ *Pedido Recebido - #${order.id
          .slice(0, 8)
          .toUpperCase()}*

Olá ${body.customerName}!

Seu pedido foi confirmado com sucesso! 🍔

📋 *Resumo:*
💰 Total: R$ ${body.total.toFixed(2)}
💳 Pagamento: ${body.paymentMethod}
⏱️ Tempo estimado: ${estimatedTime}

Você receberá uma notificação quando seu pedido sair para entrega.

🙏 Obrigado pela preferência!`;

        const whatsappResponse = await fetch(
          `${request.nextUrl.origin}/api/twilio/send-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: phoneClean,
              message: message,
            }),
          }
        );

        if (!whatsappResponse.ok) {
          console.error("⚠️ Falha ao enviar WhatsApp, mas pedido foi criado");
        } else {
          console.log("✅ WhatsApp enviado com sucesso");
        }
      } catch (whatsappError) {
        console.error("⚠️ Erro ao enviar confirmação WhatsApp:", whatsappError);
        // Não falhar a requisição se WhatsApp falhar
        // O pedido já está salvo, isso é o mais importante
      }
    } else {
      console.log(
        "🚫 Envio de notificação de confirmação de pedido desativado."
      );
    }

    console.log("🎉 Processo completo! Pedido criado com sucesso");
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      message: "Pedido criado com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro geral ao criar pedido:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// Opcional: método GET para teste
export async function GET() {
  return NextResponse.json({
    message: "API de criação de pedidos está funcionando!",
    method: "Use POST para criar pedidos",
  });
}
