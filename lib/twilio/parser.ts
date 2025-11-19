import { SupabaseClient } from '@supabase/supabase-js';
import { PaymentMethod } from '@/types';

export interface ParsedOrder {
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
  paymentMethod: PaymentMethod;
  changeAmount?: number;
}

export async function parseOrderFromWhatsApp(
  message: string,
  phoneNumber: string,
  supabase: SupabaseClient
): Promise<ParsedOrder | null> {
  try {
    // Extrair nome do cliente (primeira linha após "PEDIDO -")
    const nameMatch = message.match(/\*PEDIDO - (.+?)\*/);
    const customerName = nameMatch ? nameMatch[1] : 'Cliente';

    // Extrair telefone
    const phoneMatch = message.match(/📱 Telefone: (.+)/);
    const customerPhone = phoneMatch ? phoneMatch[1] : phoneNumber;

    // Extrair endereço
    const addressMatch = message.match(/📍 Endereço: (.+)/);
    const customerAddress = addressMatch ? addressMatch[1] : null;

    // Extrair método de pagamento
    const paymentMatch = message.match(/💳 Pagamento: (.+)/);
    const paymentMethod: PaymentMethod = paymentMatch && paymentMatch[1].includes('PIX') 
      ? 'PIX' 
      : 'DINHEIRO';

    // Extrair troco
    const changeMatch = message.match(/💰 Troco: R\$ (.+)/);
    const changeAmount = changeMatch ? parseFloat(changeMatch[1]) : undefined;

    // Extrair total
    const totalMatch = message.match(/\*TOTAL: R\$ (.+)\*/);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 0;

    // Extrair itens (linhas que começam com "•")
    const itemsSection = message.match(/\*ITENS:\*\n([\s\S]*?)\n\n\*TOTAL/);
    if (!itemsSection) return null;

    const itemsText = itemsSection[1];
    const itemLines = itemsText.split('\n').filter(line => line.trim().startsWith('•'));

    // Buscar produtos no Supabase para mapear nomes para IDs
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price');

    if (!products) return null;

    const items = itemLines.map(line => {
      // Formato: "• Nome do Produto x2 - R$ 10.00"
      const match = line.match(/• (.+?) x(\d+) - R\$ (.+)/);
      if (!match) return null;

      const productName = match[1].trim();
      const quantity = parseInt(match[2]);
      const subtotal = parseFloat(match[3]);

      // Encontrar produto pelo nome
      const product = products.find(p => p.name === productName);
      if (!product) return null;

      return {
        productId: product.id,
        quantity,
        price: product.price,
        subtotal,
      };
    }).filter(Boolean) as ParsedOrder['items'];

    return {
      customerName,
      customerPhone,
      customerAddress,
      items,
      total,
      paymentMethod,
      changeAmount,
    };
  } catch (error) {
    console.error('Error parsing WhatsApp message:', error);
    return null;
  }
}

