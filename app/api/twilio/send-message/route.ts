// app/api/twilio/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/**
 * Formata um número de telefone para o padrão E.164 para WhatsApp (`whatsapp:+55...`).
 * - Remove caracteres não numéricos.
 * - Garante que o código do país (+55) esteja presente.
 */
function formatPhoneForWhatsApp(phone: string): string {
  console.log(`[formatPhoneForWhatsApp] Entrada: "${phone}"`);
  const cleanPhone = phone.replace(/\D/g, "");

  // Se o número já inclui o código do país (55) e tem 12 ou 13 dígitos (55 + DDD + 8 ou 9 dígitos), usamos ele.
  if (cleanPhone.startsWith("55") && [12, 13].includes(cleanPhone.length)) {
    const finalNumber = `whatsapp:+${cleanPhone}`;
    console.log(`[formatPhoneForWhatsApp] ✅ Número já formatado: ${finalNumber}`);
    return finalNumber;
  }

  // Se for um número local (10 ou 11 dígitos: DDD + 8 ou 9), adicionamos o +55.
  if ([10, 11].includes(cleanPhone.length)) {
    const finalNumber = `whatsapp:+55${cleanPhone}`;
    console.log(`[formatPhoneForWhatsApp] ✅ Número formatado: ${finalNumber}`);
    return finalNumber;
  }

  console.warn(
    `[formatPhoneForWhatsApp] ⚠️ Número com formato inesperado: ${cleanPhone}`
  );
  // Retorna o número com a melhor tentativa de formatação.
  return `whatsapp:+55${cleanPhone}`;
}

export async function POST(request: NextRequest) {
  console.log("📱 API /api/twilio/send-message chamada!");

  // Aceita tanto `message` (formato livre) quanto `template`
  const { to, message, template } = await request.json();
  console.log("📦 Dados recebidos:", {
    to,
    message: message ? message.slice(0, 50) + "..." : "",
    template: template,
  });

  if (!to || (!message && !template)) {
    return NextResponse.json(
      { error: 'O campo "to" e "message" ou "template" são obrigatórios' },
      { status: 400 }
    );
  }

  if (template && (!template.contentSid || !template.contentVariables)) {
    return NextResponse.json(
      {
        error:
          'Para usar um template, "contentSid" e "contentVariables" são obrigatórios',
      },
      { status: 400 }
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !whatsappFrom) {
    console.error("❌ Variáveis de ambiente Twilio não configuradas!");
    return NextResponse.json(
      { error: "Configuração do Twilio ausente no servidor." },
      { status: 500 }
    );
  }

  try {
    const client = twilio(accountSid, authToken);
    const toNumber = formatPhoneForWhatsApp(to);

    // Monta o payload da mensagem
    const messagePayload: any = {
      from: whatsappFrom,
      to: toNumber,
    };

    if (template) {
      // Usa o Message Template
      messagePayload.contentSid = template.contentSid;
      messagePayload.contentVariables = JSON.stringify(template.contentVariables);
      console.log("🚀 Enviando MENSAGEM DE TEMPLATE via Twilio...");
    } else {
      // Usa a mensagem de formato livre
      messagePayload.body = message;
      console.log("🚀 Enviando MENSAGEM DE FORMATO LIVRE via Twilio...");
    }
    
    console.log("   From:", messagePayload.from);
    console.log("   To:", messagePayload.to);

    const result = await client.messages.create(messagePayload);

    console.log("✅ Mensagem enviada com sucesso!");
    console.log("📊 SID:", result.sid);
    console.log("📊 Status:", result.status);

    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
    });
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem WhatsApp:", error.message);
    console.error("   Código do erro:", error.code);
    console.error("   Detalhes:", error);

    let userMessage = "Falha ao enviar mensagem WhatsApp.";
    if (error.code === 21211) {
      userMessage =
        "Número de telefone inválido. Verifique se está correto e tente novamente.";
      console.error(
        "   Solução: O número de destino provavelmente não é um número de WhatsApp válido."
      );
    } else if (error.code === 63016) {
        userMessage = "Falha ao enviar. Fora da janela de 24h para mensagens de formato livre. Use um Message Template."
        console.error(
            "   Solução: O destinatário não interage há mais de 24h. É necessário usar um Message Template aprovado."
          );
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de envio WhatsApp está ativa",
    configured: !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    ),
    method: "Use POST para enviar mensagens.",
  });
}
