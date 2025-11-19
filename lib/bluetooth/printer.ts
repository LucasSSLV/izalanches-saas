// Utilitário para impressão via Bluetooth usando Web Bluetooth API

export interface BluetoothPrinter {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

export async function connectToPrinter(): Promise<BluetoothPrinter> {
  try {
    // Solicitar dispositivo Bluetooth
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // ESC/POS service
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });

    // Conectar ao servidor GATT
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error('Failed to connect to GATT server');
    }

    // Obter serviço ESC/POS
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    
    // Obter característica para escrita
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    return { device, characteristic };
  } catch (error) {
    console.error('Error connecting to printer:', error);
    throw error;
  }
}

export function generateESCCommands(text: string): Uint8Array {
  const encoder = new TextEncoder();
  const commands: number[] = [];

  // ESC @ - Initialize printer
  commands.push(0x1B, 0x40);
  
  // Text
  const textBytes = encoder.encode(text);
  commands.push(...Array.from(textBytes));
  
  // LF - Line feed
  commands.push(0x0A);
  
  // Cut paper
  commands.push(0x1D, 0x56, 0x00);

  return new Uint8Array(commands);
}

export async function printText(printer: BluetoothPrinter, text: string): Promise<void> {
  const commands = generateESCCommands(text);
  await printer.characteristic.writeValue(commands);
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
    console.error('Error printing via Serial:', error);
    throw error;
  }
}

