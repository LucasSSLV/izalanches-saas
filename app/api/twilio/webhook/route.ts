import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseOrderFromWhatsApp } from '@/lib/twilio/parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extrair número do WhatsApp (remover "whatsapp:")
    const phoneNumber = from.replace('whatsapp:', '');

    // Salvar pedido no Supabase
    const supabase = await createClient();
    
    // Parsear mensagem do WhatsApp para criar pedido
    const orderData = await parseOrderFromWhatsApp(body, phoneNumber, supabase);

    if (!orderData) {
      return NextResponse.json({ error: 'Could not parse order' }, { status: 400 });
    }
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_address: orderData.customerAddress,
        total: orderData.total,
        payment_method: orderData.paymentMethod,
        change_amount: orderData.changeAmount,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Criar itens do pedido
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

