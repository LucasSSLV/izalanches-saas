import { Order } from "@/types";
import { generatePIXPayload } from "@/lib/pix/qrcode";
import {
  connectToPrinter,
  generateESCCommands,
  generateQRCodeCommands,
} from "./printer";

export async function printReceipt(order: Order): Promise<void> {
  try {
    // Conectar à impressora
    const printer = await connectToPrinter();
    const { characteristic } = printer;

    // --- Parte 1: Cabeçalho e Itens ---
    let receiptText = "\x1B\x40"; // ESC @ - Initialize printer
    receiptText += "\x1B\x61\x01"; // ESC a 1 - Center align

    // Cabeçalho
    receiptText += "================================\n";
    receiptText += "     LANCHONETE\n";
    receiptText += "================================\n\n";
    receiptText += "\x1B\x61\x00"; // ESC a 0 - Left align

    // Informações do pedido
    receiptText += `Pedido: #${order.id.slice(0, 8)}\n`;
    receiptText += `Data: ${new Date(order.created_at).toLocaleString(
      "pt-BR"
    )}\n\n`;

    receiptText += "--------------------------------\n";
    receiptText += "CLIENTE\n";
    receiptText += "--------------------------------\n";
    receiptText += `Nome: ${order.customer_name}\n`;
    receiptText += `Telefone: ${order.customer_phone}\n`;
    if (order.customer_address) {
      receiptText += `Endereço: ${order.customer_address}\n`;
    }
    receiptText += "\n";

    // Itens
    receiptText += "--------------------------------\n";
    receiptText += "ITENS\n";
    receiptText += "--------------------------------\n";
    order.items.forEach((item) => {
      const productName = item.product?.name || "Produto";
      receiptText += `${item.quantity}x ${productName}\n`;
      receiptText += `   R$ ${item.price.toFixed(2)} x ${
        item.quantity
      } = R$ ${item.subtotal.toFixed(2)}\n`;
    });
    receiptText += "\n";

    // --- Parte 2: Total e Pagamento ---
    receiptText += "--------------------------------\n";
    receiptText += `TOTAL: R$ ${order.total.toFixed(2)}\n`;
    receiptText += "--------------------------------\n\n";
    receiptText += "--------------------------------\n";
    receiptText += "PAGAMENTO\n";
    receiptText += "--------------------------------\n";
    receiptText += `Método: ${order.payment_method}\n`;

    // Envia a primeira parte do texto
    await characteristic.writeValue(generateESCCommands(receiptText));

    // --- Parte 3: QR Code (se for PIX) ---
    if (order.payment_method === "PIX") {
      const pixPayload = generatePIXPayload({
        merchantName: "LANCHONETE",
        merchantCity: "SAO PAULO",
        amount: order.total,
        description: `Pedido #${order.id.slice(0, 8)}`,
        transactionId: order.id,
      });

      // Centraliza para o QR Code
      await characteristic.writeValue(new Uint8Array([0x1b, 0x61, 0x01]));
      // Gera e envia os comandos do QR Code
      const qrCommands = generateQRCodeCommands(pixPayload);
      await characteristic.writeValue(qrCommands);
      // Volta ao alinhamento à esquerda
      await characteristic.writeValue(new Uint8Array([0x1b, 0x61, 0x00]));
    }

    // --- Parte 4: Restante do Recibo ---
    let footerText = "";
    if (order.payment_method === "PIX") {
      footerText += "Escaneie o QR Code acima para pagar\n";
    } else if (order.payment_method === "DINHEIRO") {
      if (order.change_amount) {
        const change = order.change_amount - order.total;
        footerText += `Valor recebido: R$ ${order.change_amount.toFixed(2)}\n`;
        footerText += `TROCO: R$ ${change.toFixed(2)}\n`;
      }
    }

    footerText += "\n\n";
    footerText += "\x1B\x61\x01"; // Centraliza
    footerText += "================================\n";
    footerText += "     OBRIGADO PELA PREFERÊNCIA!\n";
    footerText += "================================\n";
    footerText += "\n\n\n";
    // Adiciona o comando de corte de papel apenas no final
    footerText += "\x1D\x56\x00";

    // Envia o rodapé e o comando de corte
    await characteristic.writeValue(generateESCCommands(footerText));
  } catch (error) {
    console.error("Error printing receipt:", error);
    throw error;
  }
}
