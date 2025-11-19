import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

if (!accountSid || !authToken || !whatsappFrom) {
  throw new Error('Twilio credentials are missing');
}

export const twilioClient = twilio(accountSid, authToken);

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const result = await twilioClient.messages.create({
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

