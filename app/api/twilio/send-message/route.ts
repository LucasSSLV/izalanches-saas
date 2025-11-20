// app/api/twilio/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Formata um número de telefone brasileiro para o padrão E.164 para uso com o WhatsApp.
 * - Remove tudo que não é número
 * - Garante que tenha código do país +55
 * - Não adiciona dígito 9 se já tiver 11 dígitos (celular)
 */
function formatBrazilianPhone(phone: string): string {
  console.log(`[formatBrazilianPhone] Entrada original: "${phone}"`);

  // Remove tudo que não é número
  const cleanPhone = phone.replace(/\D/g, "");
  console.log(
    `[formatBrazilianPhone] Número limpo: ${cleanPhone} (Tamanho: ${cleanPhone.length})`
  );

  let nationalNumber = cleanPhone;

  // Remove o código do país '55' se já estiver presente
  if (nationalNumber.startsWith("55") && nationalNumber.length > 11) {
    nationalNumber = nationalNumber.substring(2);
  }

  // Se o número nacional tem 11 dígitos (DDD + 9 + número) e o 3º dígito é '9', remove o '9'
  if (nationalNumber.length === 11 && nationalNumber.charAt(2) === '9') {
    const ddd = nationalNumber.substring(0, 2);
    const numberWithout9 = nationalNumber.substring(3);
    nationalNumber = ddd + numberWithout9;
    console.log(`[formatBrazilianPhone] Nono dígito removido. Novo número nacional: ${nationalNumber}`);
  }

  // Validar DDD
  const ddd = nationalNumber.substring(0, 2);
  const validDDDs = [
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "21",
    "22",
    "24",
    "27",
    "28",
    "31",
    "32",
    "33",
    "34",
    "35",
    "37",
    "38",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "51",
    "53",
    "54",
    "55",
    "61",
    "62",
    "63",
    "64",
    "65",
    "66",
    "67",
    "68",
    "69",
    "71",
    "73",
    "74",
    "75",
    "77",
    "79",
    "81",
    "82",
    "83",
    "84",
    "85",
    "86",
    "87",
    "88",
    "89",
    "91",
    "92",
    "93",
    "94",
    "95",
    "96",
    "97",
    "98",
    "99",
  ];

  if (!validDDDs.includes(ddd)) {
    console.warn(`[formatBrazilianPhone] ⚠️ DDD "${ddd}" não é válido!`);
  }

  // Validar tamanho
  // 10 dígitos = fixo (DDD + 8 dígitos)
  if (nationalNumber.length !== 10) {
    console.warn(
      `[formatBrazilianPhone] ⚠️ Número final tem ${nationalNumber.length} dígitos. Esperado: 10 (DDD + 8 dígitos)`
    );
  }

  // A lógica anterior que avisava sobre celulares antigos foi removida,
  // pois agora estamos forçando o formato de 10 dígitos.

  const result = `whatsapp:+55${nationalNumber}`;
  console.log(`[formatBrazilianPhone] ✅ Número final: ${result}`);
  return result;
}

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
    console.log("📞 Número recebido:", to);
    console.log("📤 De:", whatsappFrom);

    // Formatar número de destino
    const toNumber = formatBrazilianPhone(to);

    // Importar Twilio dinamicamente (apenas no servidor)
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);

    console.log("🚀 Enviando mensagem via Twilio...");
    console.log("   From:", whatsappFrom);
    console.log("   To:", toNumber);

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

    // Erros comuns do Twilio
    if (error.code === 21211) {
      console.error(
        "❌ ERRO: Número inválido ou não está no WhatsApp Sandbox!"
      );
      console.error(
        "   Solução: Envie 'join <código>' para o número do Twilio no WhatsApp"
      );
    } else if (error.code === 63016) {
      console.error("❌ ERRO: Número não verificado no Twilio!");
      console.error(
        "   Solução: Adicione o número na lista de verified numbers"
      );
    } else if (error.code === 21608) {
      console.error("❌ ERRO: Número não pode receber SMS/WhatsApp!");
    }

    return NextResponse.json(
      {
        error: "Falha ao enviar mensagem WhatsApp",
        details: error.message || "Erro desconhecido",
        code: error.code,
        moreInfo: error.moreInfo,
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
    example: {
      to: "8881725648",
      message: "Sua mensagem aqui",
    },
  });
}
