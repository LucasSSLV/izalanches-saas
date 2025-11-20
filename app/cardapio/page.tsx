'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, Category } from '@/types';
import Image from 'next/image';
import { ShoppingCart, X, Check, Loader2, AlertCircle } from 'lucide-react';

export default function CardapioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'DINHEIRO'>('PIX');
  const [changeAmount, setChangeAmount] = useState('');
  const [agreeNotifications, setAgreeNotifications] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) setCategories(data);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('name');

    if (data) setProducts(data);
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }

  /**
   * Normaliza o número de telefone para o formato de 10 ou 11 dígitos (DDD + número),
   * removendo o nono dígito de celulares se necessário para compatibilidade.
   */
  function normalizePhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');

    // Se o número tem 11 dígitos (DDD + 9 + número), e o nono dígito é '9'
    if (cleanPhone.length === 11 && cleanPhone.charAt(2) === '9') {
      // Retorna DDD + os 8 dígitos restantes, removendo o '9'
      return cleanPhone.substring(0, 2) + cleanPhone.substring(3);
    }

    // Para números de 10 dígitos (fixo ou celular antigo) ou outros casos,
    // retorna o número limpo como está.
    return cleanPhone;
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validações
    if (cart.length === 0) {
      setError('Adicione itens ao carrinho!');
      return;
    }

    if (!customerName.trim()) {
      setError('Digite seu nome');
      return;
    }

    const phoneNumbers = normalizePhoneNumber(customerPhone);
    if (phoneNumbers.length < 10) {
      setError('Telefone inválido. Digite com DDD');
      return;
    }

    if (!agreeNotifications) {
      setError('Você precisa aceitar receber notificações via WhatsApp');
      return;
    }

    if (paymentMethod === 'DINHEIRO' && changeAmount) {
      const change = parseFloat(changeAmount);
      const total = getTotal();
      if (change < total) {
        setError('Valor do troco deve ser maior que o total do pedido');
        return;
      }
    }

    setLoading(true);

    try {
      const total = getTotal();
      const orderData = {
        customerName: customerName.trim(),
        customerPhone: phoneNumbers,
        customerAddress: customerAddress.trim() || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        })),
        total,
        paymentMethod,
        changeAmount: paymentMethod === 'DINHEIRO' && changeAmount ? parseFloat(changeAmount) : undefined,
      };

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar pedido');
      }

      // Sucesso!
      setOrderId(result.orderNumber || result.orderId.slice(0, 8));
      setShowSuccess(true);

      // Limpar formulário
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setChangeAmount('');
      setAgreeNotifications(false);

      // Fechar modal após 8 segundos
      setTimeout(() => {
        setShowSuccess(false);
      }, 8000);

    } catch (error: any) {
      console.error('Erro ao enviar pedido:', error);
      setError(error.message || 'Erro ao enviar pedido. Tente novamente!');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de Sucesso */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="text-white" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Pedido Enviado! 🎉
            </h2>
            <p className="text-gray-600 mb-2 text-lg">
              Seu pedido <span className="font-bold text-blue-600">#{orderId}</span> foi recebido!
            </p>
            <p className="text-sm text-gray-500 mb-6">
              📱 Você receberá confirmação e atualizações via WhatsApp
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Fazer Novo Pedido
            </button>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              🍔 Cardápio Digital
            </h1>
            <div className="relative">
              <ShoppingCart className="text-gray-600" size={28} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filtros de Categoria */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === null
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            Todos
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Produtos */}
          <div className="lg:col-span-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Nenhum produto disponível no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all"
                  >
                    {product.image_url && (
                      <div className="relative h-48 w-full bg-gray-200">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-2xl font-bold text-blue-600">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={24} />
                Seu Pedido
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">Seu carrinho está vazio</p>
                  <p className="text-sm text-gray-400 mt-1">Adicione produtos para continuar</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitOrder}>
                  {/* Itens do Carrinho */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3 border-b pb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-gray-600">{item.product.name}</p>
                          <p className="text-xs text-gray-500">
                            R$ {item.product.price.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-green-500">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-blue-400 hover:bg-blue-500 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span className='text-gray-700'>Total:</span>
                      <span className="text-green-600">R$ {getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Erro */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Dados do Cliente */}
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      placeholder="Seu nome *"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      required
                      className="w-full px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 placeholder:text-gray-400"
                    />
                    <input
                      type="tel"
                      placeholder="Telefone (11) 99999-9999 *"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(formatPhone(e.target.value))}
                      required
                      maxLength={15}
                      className="w-full px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 placeholder:text-gray-400"
                    />
                    <textarea
                      placeholder="Endereço de entrega (opcional)"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all text-gray-700 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Método de Pagamento */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-blue-700">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PIX')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all text-white ${paymentMethod === 'PIX'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-green-400 text-gray-700 hover:bg-green-500'
                          }`}
                      >
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DINHEIRO')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${paymentMethod === 'DINHEIRO'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        Dinheiro
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'DINHEIRO' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-blue-700">Troco para quanto?</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.00"
                        value={changeAmount}
                        onChange={e => setChangeAmount(e.target.value)}
                        className="w-full px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 placeholder:text-gray-400"
                      />
                    </div>
                  )}

                  {/* Aceitar Notificações */}
                  <div className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeNotifications}
                        onChange={e => setAgreeNotifications(e.target.checked)}
                        required
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Aceito receber notificações sobre meu pedido via WhatsApp *
                      </span>
                    </label>
                  </div>

                  {/* Botão Finalizar */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Enviando Pedido...
                      </>
                    ) : (
                      <>
                        <Check size={24} />
                        Finalizar Pedido
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}