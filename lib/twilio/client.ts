import twilio from 'twilio';

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are missing');
  }

  return twilio(accountSid, authToken);
}

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const client = getTwilioClient();
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM is missing');
    }

    const result = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${to}`,
      body: message,
    });
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

