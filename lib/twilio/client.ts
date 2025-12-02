// lib/twilio/client.ts
import twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are missing");
  }

  return twilio(accountSid, authToken);
}

/**
 * Formata um número de telefone para o padrão E.164 para WhatsApp (`whatsapp:+55...`).
 */
function formatPhoneForWhatsApp(phone: string): string {
  console.log(`[formatPhoneForWhatsApp] Entrada: "${phone}"`);
  const cleanPhone = phone.replace(/\D/g, "");

  // Se o número já inclui o código do país (55) e tem 12 ou 13 dígitos
  if (cleanPhone.startsWith("55") && [12, 13].includes(cleanPhone.length)) {
    const finalNumber = `whatsapp:+${cleanPhone}`;
    console.log(
      `[formatPhoneForWhatsApp] ✅ Número já formatado: ${finalNumber}`
    );
    return finalNumber;
  }

  // Se for um número local (10 ou 11 dígitos: DDD + 8 ou 9)
  if ([10, 11].includes(cleanPhone.length)) {
    const finalNumber = `whatsapp:+55${cleanPhone}`;
    console.log(`[formatPhoneForWhatsApp] ✅ Número formatado: ${finalNumber}`);
    return finalNumber;
  }

  console.warn(
    `[formatPhoneForWhatsApp] ⚠️ Número com formato inesperado: ${cleanPhone}`
  );
  return `whatsapp:+55${cleanPhone}`;
}

// Função original para mensagens de texto livre
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const client = getTwilioClient();
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!whatsappFrom) {
      throw new Error("TWILIO_WHATSAPP_FROM is missing");
    }

    const result = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${to}`,
      body: message,
    });
    return result;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

// Nova função para enviar templates aprovados
export interface SendWhatsAppTemplateParams {
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
}

export async function sendWhatsAppTemplate({
  to,
  contentSid,
  contentVariables,
}: SendWhatsAppTemplateParams) {
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  console.log("🔑 Verificando variáveis de ambiente Twilio...");

  if (!whatsappFrom) {
    console.error("❌ TWILIO_WHATSAPP_FROM não configurado");
    throw new Error("TWILIO_WHATSAPP_FROM is missing");
  }

  try {
    const client = getTwilioClient();
    const toNumber = formatPhoneForWhatsApp(to);

    const messagePayload = {
      from: whatsappFrom,
      to: toNumber,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVariables),
    };

    console.log("🚀 Enviando MENSAGEM DE TEMPLATE via Twilio...");
    console.log("   From:", messagePayload.from);
    console.log("   To:", messagePayload.to);
    console.log("   ContentSid:", messagePayload.contentSid);
    console.log("   Variables:", messagePayload.contentVariables);

    const result = await client.messages.create(messagePayload);

    console.log("✅ Mensagem de template enviada com sucesso!");
    console.log("📊 SID:", result.sid);
    console.log("📊 Status:", result.status);

    return {
      success: true,
      messageSid: result.sid,
      status: result.status,
    };
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem WhatsApp via template:");
    console.error("   📛 Mensagem:", error.message);
    console.error("   🔢 Código:", error.code);
    console.error("   📄 Status:", error.status);
    console.error("   🔗 More Info:", error.moreInfo);

    let userMessage = "Falha ao enviar mensagem WhatsApp.";

    if (error.code === 21211) {
      userMessage = "Número de telefone inválido.";
      console.error("   💡 Solução: Verifique o formato do número.");
    } else if (error.code === 63016) {
      userMessage = "Fora da janela de 24h. Use um Message Template.";
      console.error("   💡 Solução: Use um template aprovado.");
    } else if (error.code === 63007) {
      userMessage = "Template não encontrado ou não aprovado.";
      console.error("   💡 Solução: Verifique o ContentSID no Twilio Console.");
    } else if (error.code === 63008) {
      userMessage = "Variáveis do template não correspondem ao esperado.";
      console.error("   💡 Solução: Verifique as variáveis do template.");
    }

    throw new Error(
      `${userMessage} (Código: ${error.code}) - ${error.message}`
    );
  }
}
