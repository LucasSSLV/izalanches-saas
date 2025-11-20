// components/Column.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Order, OrderStatus } from '@/types';
import OrderCard from './OrderCard';

interface ColumnProps {
  status: OrderStatus;
  orders: Order[];
  label: string;
  color: string;
  sendingNotification: string | null;
}

export default function Column({ status, orders, label, color, sendingNotification }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className={`${color} rounded-lg p-4 min-h-[600px]`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-gray-700">
          {orders.length}
        </span>
      </div>

      <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isSendingNotification={sendingNotification === order.id}
            />
          ))}
        </div>
      </SortableContext>

      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nenhum pedido</p>
        </div>
      )}
    </div>
  );
}
