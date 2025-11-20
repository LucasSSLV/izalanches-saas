'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, FinancialReport } from '@/types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FinancialReports() {
  const [startDate, setStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  async function loadReport() {
    setLoading(true);
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .eq('status', 'CONCLUIDO')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading report:', error);
        return;
      }

      const formattedOrders = (orders || []).map((order: any) => ({
        ...order,
        items: order.order_items || [],
      })) as Order[];

      const totalRevenue = formattedOrders.reduce((sum, order) => sum + order.total, 0);
      const pixRevenue = formattedOrders
        .filter(o => o.payment_method === 'PIX')
        .reduce((sum, order) => sum + order.total, 0);
      const cashRevenue = formattedOrders
        .filter(o => o.payment_method === 'DINHEIRO')
        .reduce((sum, order) => sum + order.total, 0);

      setReport({
        period_start: startDate,
        period_end: endDate,
        total_orders: formattedOrders.length,
        total_revenue: totalRevenue,
        pix_revenue: pixRevenue,
        cash_revenue: cashRevenue,
        orders: formattedOrders,
      });
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Relatórios Financeiros</h2>

      <div className="bg-blue-100 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-black"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total de Pedidos</h3>
              <p className="text-3xl font-bold text-gray-900">{report.total_orders}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Receita Total</h3>
              <p className="text-3xl font-bold text-green-600">
                R$ {report.total_revenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Receita PIX</h3>
              <p className="text-3xl font-bold text-blue-600">
                R$ {report.pix_revenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Receita Dinheiro</h3>
              <p className="text-3xl font-bold text-yellow-600">
                R$ {report.cash_revenue.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-blue-800">Pedidos do Período</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Itens
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Pagamento
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.orders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-gray-500 text-xs">{order.customer_phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.items.length} item(s)
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            order.payment_method === 'PIX'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        R$ {order.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Nenhum dado encontrado para o período selecionado.
        </div>
      )}
    </div>
  );
}

