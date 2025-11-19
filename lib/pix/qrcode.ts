// Geração de PIX QR Code

export interface PIXData {
  merchantName: string;
  merchantCity: string;
  amount: number;
  description?: string;
  transactionId?: string;
}

export function generatePIXPayload(data: PIXData): string {
  const {
    merchantName,
    merchantCity,
    amount,
    description = '',
    transactionId = `ORDER${Date.now()}`,
  } = data;

  // Formato do payload PIX (EMV QR Code)
  const payload: string[] = [];

  // Payload Format Indicator
  payload.push('01' + String(02).padStart(2, '0'));

  // Merchant Account Information
  const merchantInfo: string[] = [];
  merchantInfo.push('00' + String('BR.GOV.BCB.PIX').length.toString().padStart(2, '0') + 'BR.GOV.BCB.PIX');
  merchantInfo.push('01' + String(transactionId.length).padStart(2, '0') + transactionId);
  const merchantInfoStr = merchantInfo.join('');
  payload.push('26' + String(merchantInfoStr.length).padStart(2, '0') + merchantInfoStr);

  // Merchant Category Code
  payload.push('52' + String('0000').length.toString().padStart(2, '0') + '0000');

  // Transaction Currency (BRL = 986)
  payload.push('53' + String('986').length.toString().padStart(2, '0') + '986');

  // Transaction Amount
  const amountStr = amount.toFixed(2);
  payload.push('54' + String(amountStr.length).padStart(2, '0') + amountStr);

  // Country Code
  payload.push('58' + String('BR').length.toString().padStart(2, '0') + 'BR');

  // Merchant Name
  payload.push('59' + String(merchantName.length).padStart(2, '0') + merchantName);

  // Merchant City
  payload.push('60' + String(merchantCity.length).padStart(2, '0') + merchantCity);

  // Additional Data Field Template
  if (description) {
    const additionalData = '05' + String(description.length).padStart(2, '0') + description;
    payload.push('62' + String(additionalData.length).padStart(2, '0') + additionalData);
  }

  // CRC16
  const payloadStr = payload.join('');
  const crc = calculateCRC16(payloadStr + '6304');
  payload.push('63' + String('04').length.toString().padStart(2, '0') + crc);

  return payload.join('');
}

function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

