import { NextRequest, NextResponse } from 'next/server';

// Rota para receber webhooks do Twilio, como o status de entrega de mensagens.
export async function POST(request: NextRequest) {
  console.log('🔥 API /api/twilio/webhook chamada!');

  try {
    // O Twilio envia os dados do webhook como 'form-urlencoded'
    const formData = await request.formData();
    const body = Object.fromEntries(formData);

    // Registra o corpo do webhook no console para depuração.
    // Aqui você pode ver o status da mensagem (ex: 'sent', 'delivered', 'failed')
    console.log('📦 Webhook do Twilio recebido:', body);

    // TODO: Adicionar lógica futura aqui.
    // Por exemplo, você poderia salvar o status da mensagem no seu banco de dados,
    // associando-o ao pedido correspondente usando o 'MessageSid'.

    // Responde ao Twilio com 200 OK para confirmar o recebimento.
    // Se não fizermos isso, o Twilio tentará enviar o webhook novamente.
    return new NextResponse(null, { status: 200 });

  } catch (error) {
    console.error('❌ Erro ao processar webhook do Twilio:', error);
    // Retorna um erro 500 se algo der errado no nosso lado.
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}
