// components/OrderCard.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '@/types';
import { Printer, Loader2, Clock, MapPin, CreditCard, Banknote } from 'lucide-react';
import { printReceipt } from '@/lib/bluetooth/receipt';
import { useState } from 'react';

interface OrderCardProps {
  order: Order;
  isDragging?: boolean;
  isSendingNotification?: boolean;
}

export default function OrderCard({ order, isDragging, isSendingNotification }: OrderCardProps) {
  const [printing, setPrinting] = useState(false);

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
    setPrinting(true);
    try {
      await printReceipt(order);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      alert('Erro ao imprimir. Verifique se a impressora está conectada via Bluetooth.');
    } finally {
      setPrinting(false);
    }
  }

  const orderAge = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg shadow-md p-4 cursor-move hover:shadow-lg transition-all border-2 ${orderAge > 30 ? 'border-red-300' : 'border-transparent'
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">
              #{order.id.slice(0, 8).toUpperCase()}
            </h3>
            {orderAge > 30 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                URGENTE
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-700">{order.customer_name}</p>
          <p className="text-xs text-gray-500">{order.customer_phone}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrint();
          }}
          disabled={printing}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
          title="Imprimir recibo"
        >
          {printing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Printer size={18} />
          )}
        </button>
      </div>

      {/* Endereço */}
      {order.customer_address && (
        <div className="flex items-start gap-2 mb-3 p-2 bg-gray-50 rounded">
          <MapPin className="text-gray-500 flex-shrink-0 mt-0.5" size={14} />
          <p className="text-xs text-gray-600">{order.customer_address}</p>
        </div>
      )}

      {/* Itens */}
      <div className="space-y-1 mb-3 border-t pt-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm text-gray-700">
            <span className="font-medium">{item.quantity}x</span>{' '}
            {item.product?.name || 'Produto'}{' '}
            <span className="text-gray-500">R$ {item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Total:</span>
          <span className="text-lg font-bold text-green-600">
            R$ {order.total.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {order.payment_method === 'PIX' ? (
              <CreditCard size={14} className="text-blue-600" />
            ) : (
              <Banknote size={14} className="text-green-600" />
            )}
            <span className={`text-xs font-medium px-2 py-1 rounded ${order.payment_method === 'PIX'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
              }`}>
              {order.payment_method}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>{orderAge}min atrás</span>
          </div>
        </div>

        {order.change_amount && (
          <div className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded">
            💰 Troco: R$ {(order.change_amount - order.total).toFixed(2)}
          </div>
        )}
      </div>

      {/* Indicador de notificação sendo enviada */}
      {isSendingNotification && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={14} />
          <span className="text-xs text-blue-700 font-medium">
            Enviando notificação WhatsApp...
          </span>
        </div>
      )}
    </div>
  );
}