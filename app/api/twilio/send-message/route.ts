// app/api/twilio/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Formata um número de telefone brasileiro para o padrão E.164 para uso com o WhatsApp.
 * - Limpa caracteres não numéricos.
 * - Remove o código do país "55" se já estiver presente.
 * - Adiciona o nono dígito a números de celular que não o possuem.
 * - Adiciona o código do país "+55" ao final.
 *
 * @param phone O número de telefone a ser formatado.
 * @returns O número formatado para Twilio (ex: "whatsapp:+5511987654321").
 */
function formatBrazilianPhone(phone: string): string {
  console.log(`[formatBrazilianPhone] Iniciando formatação para: "${phone}"`);

  const cleanPhone = phone.replace(/\D/g, "");
  console.log(`[formatBrazilianPhone] Número limpo: ${cleanPhone} (Tamanho: ${cleanPhone.length})`);

  // Remove o '55' do início se já houver, para trabalhar com o número nacional.
  let nationalNumber = cleanPhone.startsWith("55")
    ? cleanPhone.substring(2)
    : cleanPhone;

  // DDDs válidos no Brasil
  const validDDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', 
    '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', 
    '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', 
    '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', 
    '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', 
    '93', '94', '95', '96', '97', '98', '99'
  ];

  const ddd = nationalNumber.substring(0, 2);

  if (!validDDDs.includes(ddd)) {
    console.warn(`[formatBrazilianPhone] AVISO: DDD "${ddd}" não é válido. Usando número original limpo com +55.`);
    return `whatsapp:+55${cleanPhone}`;
  }

  // Se o número nacional tem 10 dígitos (DDD + 8 dígitos de número)
  if (nationalNumber.length === 10) {
    const numberPart = nationalNumber.substring(2);
    // Em números de 8 dígitos, celulares geralmente começam com 6, 7, 8 ou 9.
    // Esta é uma regra de transição. A regra definitiva é que todo celular tem 9 dígitos.
    if (/^[6-9]/.test(numberPart)) {
      nationalNumber = `${ddd}9${numberPart}`;
      console.log(`[formatBrazilianPhone] Número de celular de 10 dígitos detectado. Adicionado '9'. Novo número nacional: ${nationalNumber}`);
    }
  }

  // Se o número nacional tem 11 dígitos, deve ser DDD + 9 + número.
  if (nationalNumber.length === 11) {
    const numberPart = nationalNumber.substring(2);
    if (!numberPart.startsWith('9')) {
       console.warn(`[formatBrazilianPhone] AVISO: Número de 11 dígitos, mas não começa com '9' após o DDD. Pode ser um erro.`);
    }
  } else if (nationalNumber.length !== 10) { // Se não for 10 (fixo) nem 11 (celular)
     console.warn(`[formatBrazilianPhone] AVISO: O número nacional tem ${nationalNumber.length} dígitos, o que é incomum.`);
  }

  const finalNumber = `whatsapp:+55${nationalNumber}`;
  console.log(`[formatBrazilianPhone] Número final formatado para Twilio: ${finalNumber}`);
  return finalNumber;
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
    console.log("📞 Enviando para (original):", to);
    console.log("📤 De:", whatsappFrom);

    // Formatar número de destino
    const toNumber = formatBrazilianPhone(to);

    console.log("📱 Número formatado para Twilio:", toNumber);

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
