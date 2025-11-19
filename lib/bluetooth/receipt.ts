import { Order } from '@/types';
import { generatePIXPayload } from '@/lib/pix/qrcode';
import { printText, connectToPrinter } from './printer';

export async function printReceipt(order: Order): Promise<void> {
  try {
    // Conectar à impressora
    const printer = await connectToPrinter();

    // Gerar texto do recibo
    let receiptText = '\x1B\x40'; // ESC @ - Initialize printer
    receiptText += '\x1B\x61\x01'; // ESC a 1 - Center align
    
    // Cabeçalho
    receiptText += '================================\n';
    receiptText += '     LANCHONETE\n';
    receiptText += '================================\n\n';
    receiptText += '\x1B\x61\x00'; // ESC a 0 - Left align
    
    // Informações do pedido
    receiptText += `Pedido: #${order.id.slice(0, 8)}\n`;
    receiptText += `Data: ${new Date(order.created_at).toLocaleString('pt-BR')}\n\n`;
    
    receiptText += '--------------------------------\n';
    receiptText += 'CLIENTE\n';
    receiptText += '--------------------------------\n';
    receiptText += `Nome: ${order.customer_name}\n`;
    receiptText += `Telefone: ${order.customer_phone}\n`;
    if (order.customer_address) {
      receiptText += `Endereço: ${order.customer_address}\n`;
    }
    receiptText += '\n';
    
    // Itens
    receiptText += '--------------------------------\n';
    receiptText += 'ITENS\n';
    receiptText += '--------------------------------\n';
    order.items.forEach(item => {
      const productName = item.product?.name || 'Produto';
      receiptText += `${item.quantity}x ${productName}\n`;
      receiptText += `   R$ ${item.price.toFixed(2)} x ${item.quantity} = R$ ${item.subtotal.toFixed(2)}\n`;
    });
    receiptText += '\n';
    
    // Total
    receiptText += '--------------------------------\n';
    receiptText += `TOTAL: R$ ${order.total.toFixed(2)}\n`;
    receiptText += '--------------------------------\n\n';
    
    // Pagamento
    receiptText += '--------------------------------\n';
    receiptText += 'PAGAMENTO\n';
    receiptText += '--------------------------------\n';
    receiptText += `Método: ${order.payment_method}\n`;
    
    if (order.payment_method === 'PIX') {
      // Gerar PIX QR Code
      const pixPayload = generatePIXPayload({
        merchantName: 'LANCHONETE',
        merchantCity: 'SAO PAULO',
        amount: order.total,
        description: `Pedido #${order.id.slice(0, 8)}`,
        transactionId: order.id,
      });
      
      receiptText += '\n';
      receiptText += 'PIX QR CODE:\n';
      receiptText += pixPayload + '\n';
      receiptText += '\n';
      receiptText += 'Escaneie o QR Code acima para pagar\n';
    } else if (order.payment_method === 'DINHEIRO') {
      if (order.change_amount) {
        const change = order.change_amount - order.total;
        receiptText += `Valor recebido: R$ ${order.change_amount.toFixed(2)}\n`;
        receiptText += `TROCO: R$ ${change.toFixed(2)}\n`;
      }
    }
    
    receiptText += '\n';
    receiptText += '================================\n';
    receiptText += '     OBRIGADO PELA PREFERÊNCIA!\n';
    receiptText += '================================\n';
    receiptText += '\n\n\n';
    
    // Cortar papel
    receiptText += '\x1D\x56\x00'; // GS V 0 - Cut paper
    
    // Imprimir
    await printText(printer, receiptText);
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw error;
  }
}

