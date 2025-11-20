// components/OrdersKanban.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import OrderCard from './OrderCard';

const STATUSES: OrderStatus[] = ['NOVO', 'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  NOVO: 'Novos Pedidos',
  EM_PREPARACAO: 'Em Preparação',
  SAIU_PARA_ENTREGA: 'Saiu para Entrega',
  CONCLUIDO: 'Concluídos',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  NOVO: 'bg-yellow-100',
  EM_PREPARACAO: 'bg-blue-100',
  SAIU_PARA_ENTREGA: 'bg-purple-100',
  CONCLUIDO: 'bg-green-100',
};

export default function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);

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
    const order = orders.find(o => o.id === orderId);

    if (!STATUSES.includes(newStatus) || !order) return;

    // Se o status não mudou, não fazer nada
    if (order.status === newStatus) return;

    // Atualizar status no banco
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pedido');
      return;
    }

    // Recarregar pedidos
    loadOrders();

    // Enviar notificação apenas para status SAIU_PARA_ENTREGA
    // (a confirmação já foi enviada ao criar o pedido)
    if (newStatus === 'SAIU_PARA_ENTREGA') {
      setSendingNotification(orderId);

      try {
        const message = `🚚 *Pedido Saiu para Entrega - #${order.id.slice(0, 8).toUpperCase()}*

Olá ${order.customer_name}!

Seu pedido está a caminho! 🎉

Em breve estará aí.

Aproveite! 🍔`;

        const response = await fetch('/api/twilio/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: order.customer_phone,
            message: message,
          }),
        });

        if (!response.ok) {
          console.error('Falha ao enviar notificação WhatsApp');
        }
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      } finally {
        setSendingNotification(null);
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

  // Estatísticas
  const stats = {
    total: orders.length,
    novos: getOrdersByStatus('NOVO').length,
    emPreparacao: getOrdersByStatus('EM_PREPARACAO').length,
    saiuParaEntrega: getOrdersByStatus('SAIU_PARA_ENTREGA').length,
    concluidos: getOrdersByStatus('CONCLUIDO').length,
  };

  return (
    <div>
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Novos</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.novos}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Preparando</p>
          <p className="text-2xl font-bold text-blue-600">{stats.emPreparacao}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Em Entrega</p>
          <p className="text-2xl font-bold text-purple-600">{stats.saiuParaEntrega}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Concluídos</p>
          <p className="text-2xl font-bold text-green-600">{stats.concluidos}</p>
        </div>
      </div>

      {/* Aviso de economia */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>Sistema Otimizado:</strong> Notificações são enviadas automaticamente apenas em 2 momentos:
          <br />
          1️⃣ Quando o pedido é criado (confirmação)
          <br />
          2️⃣ Quando você move para "Saiu para Entrega"
          <br />
          <span className="text-blue-700">Isso economiza até 50% nos custos de WhatsApp! 💰</span>
        </p>
      </div>

      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const statusOrders = getOrdersByStatus(status);
            return (
              <div key={status} className={`${STATUS_COLORS[status]} rounded-lg p-4 min-h-[600px]`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {STATUS_LABELS[status]}
                  </h2>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-gray-700">
                    {statusOrders.length}
                  </span>
                </div>

                <SortableContext
                  items={statusOrders.map(o => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {statusOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSendingNotification={sendingNotification === order.id}
                      />
                    ))}
                  </div>
                </SortableContext>

                {statusOrders.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">Nenhum pedido</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <OrderCard order={activeOrder} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}