'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OrdersKanban from '@/components/OrdersKanban';
import ProductsManagement from '@/components/ProductsManagement';
import FinancialReports from '@/components/FinancialReports';

type Tab = 'pedidos' | 'produtos' | 'relatorios';

export default function PainelPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pedidos');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Painel do Atendente</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/cardapio"
                target="_blank"
                className="text-blue-600 hover:text-blue-700"
              >
                Ver Cardápio
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'pedidos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'produtos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Produtos
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'relatorios'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Relatórios Financeiros
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'pedidos' && <OrdersKanban />}
        {activeTab === 'produtos' && <ProductsManagement />}
        {activeTab === 'relatorios' && <FinancialReports />}
      </main>
    </div>
  );
}

