'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OrdersKanban from '@/components/OrdersKanban';
import ProductsManagement from '@/components/ProductsManagement';
import FinancialReports from '@/components/FinancialReports';
import LeadsManagement from '@/components/LeadsManagement';
import { Config } from 'twilio/lib/twiml/VoiceResponse';
import ConfiguracoesPage from './configuracoes/page';
import { Cog, GalleryHorizontal, X } from 'lucide-react';

type Tab = 'pedidos' | 'produtos' | 'relatorios' | 'leads';

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
    router.push('/page.tsx');
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-100">Painel do Atendente</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/cardapio"
                target="_blank"
                className="bg-green-500/60 text-white hover:bg-green-600 px-4 py-2 rounded-lg font-medium"
              >
                Cardápio
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-white hover:bg-red-700 bg-red-500 rounded-lg font-medium"
              >
                Sair
              </button>
              <button
                onClick={() => router.push('/painel/configuracoes')}
                className="px-4 py-2 text-white hover:bg-gray-700 bg-gray-500 rounded-lg font-medium"
              >
                <Cog size={20} />
              </button>

            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800/95 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-4 py-3 border-b-2 font-extrabold transition-colors ${activeTab === 'pedidos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-100 hover:text-green-300'
                }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-4 py-3 border-b-2 font-extrabold transition-colors ${activeTab === 'produtos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-100 hover:text-green-300'
                }`}
            >
              Produtos
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`px-4 py-3 border-b-2 font-extrabold transition-colors ${activeTab === 'relatorios'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-100 hover:text-green-300'
                }`}
            >
              Relatórios Financeiros
            </button>
          <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-3 border-b-2 font-extrabold transition-colors ${activeTab === 'relatorios'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-100 hover:text-green-300'
                }`}
            >
              Leads
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'pedidos' && <OrdersKanban />}
        {activeTab === 'produtos' && <ProductsManagement />}
        {activeTab === 'relatorios' && <FinancialReports activeTab={activeTab} />}
        {activeTab === 'leads' && <LeadsManagement />}
      </main>
    </div>
  );
}
