'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '@/types';
import { Printer } from 'lucide-react';
import { printReceipt } from '@/lib/bluetooth/receipt';

interface OrderCardProps {
  order: Order;
  isDragging?: boolean;
}

export default function OrderCard({ order, isDragging }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handlePrint() {
    try {
      await printReceipt(order);
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Erro ao imprimir. Verifique se a impressora está conectada.');
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-md p-4 cursor-move hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">#{order.id.slice(0, 8)}</h3>
          <p className="text-sm text-gray-600">{order.customer_name}</p>
          <p className="text-xs text-gray-500">{order.customer_phone}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrint();
          }}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Imprimir recibo"
        >
          <Printer size={18} />
        </button>
      </div>

      {order.customer_address && (
        <p className="text-xs text-gray-500 mb-2">📍 {order.customer_address}</p>
      )}

      <div className="space-y-1 mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm text-gray-700">
            {item.quantity}x {item.product?.name || 'Produto'} - R$ {item.subtotal.toFixed(2)}
          </div>
        ))}
      </div>

      <div className="border-t pt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">
          Total: R$ {order.total.toFixed(2)}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${
          order.payment_method === 'PIX'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {order.payment_method}
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {new Date(order.created_at).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}

