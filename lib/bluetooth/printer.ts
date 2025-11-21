// Utilitário para impressão via Bluetooth usando Web Bluetooth API

export interface BluetoothPrinter {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

export async function connectToPrinter(): Promise<BluetoothPrinter> {
  try {
    // Verificar se Web Bluetooth API está disponível
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth API is not available in this browser");
    }

    // Solicitar dispositivo Bluetooth
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // ESC/POS service
      ],
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });

    // Conectar ao servidor GATT
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Failed to connect to GATT server");
    }

    // Obter serviço ESC/POS
    const service = await server.getPrimaryService(
      "000018f0-0000-1000-8000-00805f9b34fb"
    );

    // Obter característica para escrita
    const characteristic = await service.getCharacteristic(
      "00002af1-0000-1000-8000-00805f9b34fb"
    );

    return { device, characteristic };
  } catch (error) {
    console.error("Error connecting to printer:", error);
    throw error;
  }
}

export function generateESCCommands(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const buffer = new ArrayBuffer(textBytes.length);
  const view = new Uint8Array(buffer);
  view.set(textBytes, 0);
  return buffer;
}

export async function printText(
  printer: BluetoothPrinter,
  text: string
): Promise<void> {
  const commands = generateESCCommands(text);
  await printer.characteristic.writeValue(commands as BufferSource);
}

export function generateQRCodeCommands(data: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const dataLength = dataBytes.length + 3;
  const pL = dataLength % 256;
  const pH = Math.floor(dataLength / 256);

  const commandBytes = [
    // Model
    0x1d,
    0x28,
    0x6b,
    0x04,
    0x00,
    0x31,
    0x41,
    0x32,
    0x00,
    // Size
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x43,
    0x08, // 8 é um bom tamanho, pode ser ajustado (1-16)
    // Error Correction
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x45,
    0x31, // Level M (31) ou L (30)
    // Store data
    0x1d,
    0x28,
    0x6b,
    pL,
    pH,
    0x31,
    0x50,
    0x30,
  ];

  const printCommandBytes = [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30];

  const buffer = new ArrayBuffer(
    commandBytes.length + dataBytes.length + printCommandBytes.length
  );
  const view = new Uint8Array(buffer);
  view.set(commandBytes, 0);
  view.set(dataBytes, commandBytes.length);
  view.set(printCommandBytes, commandBytes.length + dataBytes.length);

  return buffer;
}

// Função alternativa para impressão via Web Serial API (fallback)
export async function printViaSerial(text: string): Promise<void> {
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();

    const commands = generateESCCommands(text);
    await writer.write(commands);

    writer.releaseLock();
    await port.close();
  } catch (error) {
    console.error("Error printing via Serial:", error);
    throw error;
  }
}
