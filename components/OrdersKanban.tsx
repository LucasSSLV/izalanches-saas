'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import OrderCard from './OrderCard';

const STATUSES: OrderStatus[] = ['NOVO', 'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];
const STATUS_LABELS: Record<OrderStatus, string> = {
  NOVO: 'Novo Pedido',
  EM_PREPARACAO: 'Em Preparação',
  SAIU_PARA_ENTREGA: 'Saiu para Entrega',
  CONCLUIDO: 'Concluído',
};

export default function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
    subscribeToOrders();
  }, []);

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data.map(formatOrder));
    }
  }

  function subscribeToOrders() {
    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  function formatOrder(order: any): Order {
    return {
      ...order,
      items: order.order_items || [],
    };
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;

    if (!STATUSES.includes(newStatus)) return;

    // Atualizar status no banco
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return;
    }

    // Recarregar pedidos
    loadOrders();

    // Enviar notificação via WhatsApp
    const order = orders.find(o => o.id === orderId);
    if (order && (newStatus === 'EM_PREPARACAO' || newStatus === 'SAIU_PARA_ENTREGA')) {
      let message = '';
      if (newStatus === 'EM_PREPARACAO') {
        message = `🍔 Olá ${order.customer_name}! Seu pedido #${order.id.slice(0, 8)} está sendo preparado! Em breve você receberá mais atualizações.`;
      } else if (newStatus === 'SAIU_PARA_ENTREGA') {
        message = `🚚 Olá ${order.customer_name}! Seu pedido #${order.id.slice(0, 8)} saiu para entrega! Deve chegar em breve.`;
      }

      try {
        await fetch('/api/twilio/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: order.customer_phone,
            message: message,
          }),
        });
      } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
      }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function getOrdersByStatus(status: OrderStatus) {
    return orders.filter(order => order.status === status);
  }

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null;

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUSES.map(status => {
          const statusOrders = getOrdersByStatus(status);
          return (
            <div key={status} className="bg-gray-100 rounded-lg p-4 min-h-[500px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {STATUS_LABELS[status]} ({statusOrders.length})
              </h2>
              <SortableContext
                items={statusOrders.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {statusOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeOrder ? <OrderCard order={activeOrder} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

