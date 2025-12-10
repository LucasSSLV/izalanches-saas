'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Smartphone, 
  MessageCircle, 
  Zap, 
  Shield, 
  CheckCircle, 
  Menu, 
  X,
  ArrowRight,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  Send
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    business: '',
    phone: '',
    email: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.business || !formData.phone || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }

    setFormStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          business: formData.business,
          phone: formData.phone,
          email: formData.email,
          message: formData.message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar formulário');
      }

      setFormStatus('success');
      setFormData({ name: '', business: '', phone: '', email: '', message: '' });
      
      setTimeout(() => setFormStatus('idle'), 5000);
    } catch (error: any) {
      console.error('Erro ao enviar formulário:', error);
      alert(error.message || 'Erro ao enviar mensagem. Tente novamente!');
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  const features = [
    {
      icon: <Smartphone className="w-12 h-12 text-red-500" />,
      title: 'Cardápio Digital',
      description: 'Cardápio online moderno e responsivo que seus clientes vão amar navegar'
    },
    {
      icon: <ShoppingBag className="w-12 h-12 text-red-500" />,
      title: 'Gestão de Pedidos',
      description: 'Kanban intuitivo para gerenciar pedidos em tempo real com drag & drop'
    },
    {
      icon: <MessageCircle className="w-12 h-12 text-red-500" />,
      title: 'Notificações WhatsApp',
      description: 'Mantenha clientes informados automaticamente sobre seus pedidos'
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-red-500" />,
      title: 'Relatórios Financeiros',
      description: 'Acompanhe suas vendas e receitas com relatórios detalhados'
    },
    {
      icon: <Zap className="w-12 h-12 text-red-500" />,
      title: 'Impressão Bluetooth',
      description: 'Imprima recibos direto do navegador via impressora térmica'
    },
    {
      icon: <Shield className="w-12 h-12 text-red-500" />,
      title: 'Seguro e Confiável',
      description: 'Dados protegidos e sistema disponível 24/7'
    }
  ];

  const benefits = [
    'Aumente suas vendas em até 40%',
    'Reduza erros de pedidos em 90%',
    'Economize tempo da equipe',
    'Melhore a experiência do cliente',
    'Controle total das finanças',
    'Suporte técnico dedicado'
  ];

  const stats = [
    { icon: <Users />, value: '500+', label: 'Clientes Ativos' },
    { icon: <ShoppingBag />, value: '50k+', label: 'Pedidos/Mês' },
    { icon: <Clock />, value: '24/7', label: 'Disponibilidade' },
    { icon: <DollarSign />, value: '98%', label: 'Satisfação' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-500">🍔 Pede Aqui!</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#servicos" className="text-gray-700 hover:text-red-500 transition-colors">Serviços</a>
              <a href="#beneficios" className="text-gray-700 hover:text-red-500 transition-colors">Benefícios</a>
              <a href="#contato" className="text-gray-700 hover:text-red-500 transition-colors">Contato</a>
              <Link 
                href="/login" 
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                Acessar Painel
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-red-500 transition-colors">Serviços</a>
              <a href="#beneficios" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-red-500 transition-colors">Benefícios</a>
              <a href="#contato" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 hover:text-red-500 transition-colors">Contato</a>
              <Link 
                href="/login" 
                className="block text-center px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                Acessar Painel
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-red-100 text-red-600 rounded-full text-sm font-semibold">
                🚀 Sistema Completo de Gestão
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Transforme seu
                <span className="text-red-500"> Negócio </span>
                com Tecnologia
              </h1>
              <p className="text-xl text-gray-600">
                Sistema completo para lanchonetes e restaurantes: cardápio digital, gestão de pedidos, 
                notificações WhatsApp e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#contato"
                  className="px-8 py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  Quero ser Parceiro <ArrowRight size={20} />
                </a>
                <a 
                  href="#servicos"
                  className="px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg shadow-md border-2 border-gray-200 flex items-center justify-center gap-2"
                >
                  Conhecer Serviços
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="text-green-600" size={24} />
                    <span className="font-semibold text-gray-900">Novo pedido recebido!</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <MessageCircle className="text-blue-600" size={24} />
                    <span className="font-semibold text-gray-900">Notificação enviada</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <BarChart3 className="text-purple-600" size={24} />
                    <span className="font-semibold text-gray-900">Vendas aumentaram 40%</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-red-200 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-orange-200 rounded-full blur-3xl opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-red-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center text-white">
                <div className="flex justify-center mb-3">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-red-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="servicos" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sistema completo e integrado para gerenciar seu negócio com eficiência
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-red-200 hover:shadow-xl transition-all group"
              >
                <div className="mb-6 transform group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Por que escolher o Pede Aqui?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Junte-se a centenas de estabelecimentos que já transformaram seus negócios
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="text-white" size={16} />
                    </div>
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-500 mb-2">R$ 99</div>
                  <div className="text-gray-600">/mês por estabelecimento</div>
                </div>
                <div className="border-t pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="text-green-500" size={20} />
                    <span>Todos os recursos incluídos</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="text-green-500" size={20} />
                    <span>Suporte técnico prioritário</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="text-green-500" size={20} />
                    <span>Atualizações gratuitas</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="text-green-500" size={20} />
                    <span>Sem taxa de setup</span>
                  </div>
                </div>
                <a 
                  href="#contato"
                  className="block w-full py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold text-center"
                >
                  Começar Agora
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contato" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pronto para começar?
            </h2>
            <p className="text-xl text-gray-600">
              Preencha o formulário e nossa equipe entrará em contato
            </p>
          </div>

          {formStatus === 'success' ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Mensagem enviada com sucesso!</h3>
              <p className="text-gray-600">Em breve nossa equipe entrará em contato.</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-300 focus:border-gray-400 text-gray-600 font-bold outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome do Estabelecimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business}
                    onChange={e => setFormData({...formData, business: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-300 focus:border-gray-400 text-gray-600 font-bold outline-none transition-all"
                    placeholder="Nome da lanchonete"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-300 focus:border-gray-400 text-gray-600 font-bold outline-none transition-all"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-300 focus:border-gray-400 text-gray-600 font-bold outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mensagem (opcional)
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-300 focus:border-gray-400 text-gray-600 font-bold outline-none transition-all resize-none"
                  placeholder="Conte-nos mais sobre seu negócio..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={formStatus === 'sending'}
                className="w-full py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {formStatus === 'sending' ? (
                  <>Enviando...</>
                ) : (
                  <>
                    Enviar Mensagem <Send size={20} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold mb-4">🍔 Pede Aqui!</div>
              <p className="text-gray-400">
                Sistema completo de gestão para lanchonetes e restaurantes.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>
                <li><a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Fale Conosco</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Pede Aqui. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}