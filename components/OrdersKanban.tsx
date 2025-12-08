// components/OrdersKanban.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import OrderCard from './OrderCard';
import Column from './Column';

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
    const subscription = subscribeToOrders();
    return () => {
      subscription.unsubscribe();
    };
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
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
      return;
    }
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
        (payload) => {
          console.log('Change received!', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedOrderRecord = payload.new as Order;
            
            if (updatedOrderRecord.is_hidden) {
              // Remove pedido arquivado da lista
              setOrders((prevOrders) =>
                prevOrders.filter((order) => order.id !== updatedOrderRecord.id)
              );
            } else {
              // Atualiza pedido na lista
              setOrders((prevOrders) =>
                prevOrders.map((order) =>
                  order.id === updatedOrderRecord.id
                    ? formatOrder(updatedOrderRecord)
                    : order
                )
              );
            }
          } else if (payload.eventType === 'INSERT') {
            // Novo pedido - recarrega lista
            loadOrders();
          }
        }
      )
      .subscribe();

    return channel;
  }

  function formatOrder(order: any): Order {
    return {
      ...order,
      is_hidden: order.is_hidden,
      items: order.order_items || [],
    };
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const orderId = active.id as string;
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      return;
    }

    let newStatus: OrderStatus;

    if (STATUSES.includes(over.id as OrderStatus)) {
      newStatus = over.id as OrderStatus;
    } else {
      const overOrder = orders.find((o) => o.id === over.id);
      if (overOrder) {
        newStatus = overOrder.status;
      } else {
        return;
      }
    }

    if (order.status === newStatus) {
      return;
    }

    const originalStatus = order.status;

    // Atualiza otimisticamente o estado local
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      )
    );

    setSendingNotification(orderId);

    try {
      const response = await fetch(`/api/orders/${orderId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar status do pedido no servidor');
      }
    } catch (error) {
      console.error('Erro ao chamar API de atualização de status:', error);
      alert(`Erro ao atualizar status do pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Revertendo alteração.`);
      // Reverte otimisticamente em caso de erro
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.id === orderId ? { ...o, status: originalStatus } : o
        )
      );
    } finally {
      setSendingNotification(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Função para arquivar um único pedido
  async function handleArchiveOrder(orderId: string) {
    const response = await fetch(`/api/orders/${orderId}/archive`, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Falha ao arquivar pedido');
    }
    // Remove o pedido localmente
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
  }

  // Função para arquivar todos os pedidos concluídos
  async function handleArchiveAll() {
    const response = await fetch('/api/orders/archive-all-completed', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Falha ao arquivar pedidos');
    }
    // Remove todos os pedidos concluídos localmente
    setOrders(prevOrders => prevOrders.filter(o => o.status !== 'CONCLUIDO'));
  }

  function getOrdersByStatus(status: OrderStatus) {
    return orders.filter((order) => order.status === status);
  }

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : null;

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

      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              label={STATUS_LABELS[status]}
              color={STATUS_COLORS[status]}
              orders={getOrdersByStatus(status).map(order => ({
                ...order,
                onArchive: handleArchiveOrder
              } as any))}
              sendingNotification={sendingNotification}
              onArchiveAll={status === 'CONCLUIDO' ? handleArchiveAll : undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? <OrderCard order={activeOrder} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}