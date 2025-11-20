// app/api/twilio/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📱 API /api/twilio/send-message chamada!");

  try {
    const { to, message } = await request.json();
    console.log("📦 Dados recebidos:", {
      to,
      message: message.slice(0, 50) + "...",
    });

    // Validação
    if (!to || !message) {
      console.log("❌ Validação falhou: campos obrigatórios ausentes");
      return NextResponse.json(
        { error: 'Campos "to" e "message" são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar variáveis de ambiente
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !whatsappFrom) {
      console.error("❌ Variáveis de ambiente Twilio não configuradas!");
      console.log(
        "TWILIO_ACCOUNT_SID:",
        accountSid ? "✅ Configurado" : "❌ Ausente"
      );
      console.log(
        "TWILIO_AUTH_TOKEN:",
        authToken ? "✅ Configurado" : "❌ Ausente"
      );
      console.log(
        "TWILIO_WHATSAPP_FROM:",
        whatsappFrom ? "✅ Configurado" : "❌ Ausente"
      );

      return NextResponse.json(
        {
          error: "Configuração do Twilio ausente",
          details: "Verifique as variáveis de ambiente no .env.local",
        },
        { status: 500 }
      );
    }

    console.log("✅ Variáveis de ambiente OK");
    console.log("📞 Enviando para:", to);
    console.log("📤 De:", whatsappFrom);

    // Formatar número de destino
    const toNumber = to.startsWith("whatsapp:")
      ? to
      : `whatsapp:+${to.replace(/\D/g, "")}`;

    console.log("📱 Número formatado:", toNumber);

    // Importar Twilio dinamicamente (apenas no servidor)
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);

    console.log("🚀 Enviando mensagem via Twilio...");

    // Enviar mensagem
    const result = await client.messages.create({
      from: whatsappFrom,
      to: toNumber,
      body: message,
    });

    console.log("✅ Mensagem enviada com sucesso!");
    console.log("📊 SID:", result.sid);
    console.log("📊 Status:", result.status);

    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
    });
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem WhatsApp:", error);
    console.error("❌ Código do erro:", error.code);
    console.error("❌ Mensagem do erro:", error.message);
    console.error("❌ Detalhes completos:", JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        error: "Falha ao enviar mensagem WhatsApp",
        details: error.message || "Erro desconhecido",
        code: error.code,
      },
      { status: 500 }
    );
  }
}

// Método GET para testar se API está ativa
export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  return NextResponse.json({
    message: "API de envio WhatsApp está ativa",
    configured: {
      accountSid: !!accountSid,
      authToken: !!authToken,
      whatsappFrom: !!whatsappFrom,
    },
    method: "Use POST para enviar mensagens",
  });
}
