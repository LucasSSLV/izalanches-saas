// components/Column.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Order, OrderStatus } from '@/types';
import OrderCard from './OrderCard';
import { Clickable } from './Clickable';
import { Archive, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ColumnProps {
  status: OrderStatus;
  orders: Order[];
  label: string;
  color: string;
  sendingNotification: string | null;
}

export default function Column({ status, orders, label, color, sendingNotification }: ColumnProps) {
  const [isArchivingAll, setIsArchivingAll] = useState(false);
  const router = useRouter();
  const { setNodeRef } = useDroppable({
    id: status,
  });

  async function handleArchiveAll() {
    if (!confirm(`Tem certeza que deseja arquivar todos os ${orders.length} pedidos concluídos?`)) {
      return;
    }
    setIsArchivingAll(true);
    try {
      await fetch('/api/orders/archive-all-completed', { method: 'POST' });
      // Força a atualização da UI para garantir que todos os cards sumam.
      // A atualização em tempo real do Supabase também ajudará.
      router.refresh();
    } catch (error) {
      console.error("Erro ao arquivar todos os pedidos:", error);
      alert("Não foi possível arquivar todos os pedidos.");
    } finally {
      // O refresh da página cuidará de resetar o estado.
      setIsArchivingAll(false);
    }
  }

  return (
    <div ref={setNodeRef} className={`${color} rounded-lg p-4 min-h-[600px]`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-gray-700">
          {orders.length}
        </span>
      </div>

      {status === 'CONCLUIDO' && orders.length > 0 && (
        <div className="mb-4">
          <Clickable>
            <button
              onClick={handleArchiveAll}
              disabled={isArchivingAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isArchivingAll ? <Loader2 className="animate-spin" size={14} /> : <Archive size={14} />}
              {isArchivingAll ? 'Arquivando...' : 'Arquivar Todos'}
            </button>
          </Clickable>
        </div>
      )}

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
