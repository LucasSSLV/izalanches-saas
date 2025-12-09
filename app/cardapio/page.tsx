'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, Category } from '@/types';
import Image from 'next/image';
import { ShoppingCart, X, Check, Loader2, AlertCircle, Plus, Minus, Search, Trash } from 'lucide-react';

export default function CardapioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
    setSelectedProduct(null);
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

  function normalizePhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length === 11 && cleanPhone.charAt(2) === '9') {
      return cleanPhone.substring(0, 2) + cleanPhone.substring(3);
    }

    return cleanPhone;
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError('');

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

      setOrderId(result.orderNumber || result.orderId.slice(0, 8));
      setShowSuccess(true);
      setShowCart(false);

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setChangeAmount('');
      setAgreeNotifications(false);

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

  const searchedProducts = searchTerm
    ? filteredProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : filteredProducts;

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Modal de Sucesso */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
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
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
            >
              Fazer Novo Pedido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedProduct.image_url && (
              <div className="relative h-64 w-full bg-gray-200">
                <Image
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
              )}

              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl font-bold text-green-600">
                  R$ {selectedProduct.price.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => addToCart(selectedProduct)}
                className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carrinho Lateral */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-gray-200 z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-gray-100 backdrop-blur-2xl border-b z-10 p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-red-500">Seu Carrinho</h2>
              <button
                onClick={() => setShowCart(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-600 transition-colors"
              >
                <X size={24} color='red' />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4"
                // style={{ backgroundImage: 'url(/sem-pedidos.png)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', objectFit: 'cover', backgroundSize: '500px' }}
                >
                <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <ShoppingCart className="text-gray-600" size={48} />
                </div>
                <p className="text-gray-700 font-semibold text-lg mb-2">Seu carrinho está vazio</p>
                <p className="text-gray-600 text-center">Adicione um produto para visualizar aqui</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="p-4 space-y-6">
                {/* Itens do Carrinho */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Itens</h3>
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-3 bg-gray-50 p-3 rounded-xl">
                      {item.product.image_url && (
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{item.product.name}</h4>
                        <p className="text-sm text-green-600">R$ {item.product.price.toFixed(2)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-2 bg-white rounded-lg border">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-black hover:bg-red-600 rounded-l-lg"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center text-gray-500 font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-black hover:bg-green-600 rounded-r-lg"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="flex items-center gap-2 text-red-500 rounded-2xl p-2 shadow-xs hover:shadow-lg transition-colors"
                          >
                            <Trash size={16}/>
                            <p>Remover</p>
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          R$ {(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total</span>
                    <span className="text-2xl font-bold text-green-600">
                      R$ {getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Formulário */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Seus dados</h3>

                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    className="w-full px-4 py-3 placeholder:text-gray-400 text-gray-600 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none transition-all"
                  />

                  <input
                    type="tel"
                    placeholder="Telefone (11) 99999-9999"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(formatPhone(e.target.value))}
                    required
                    maxLength={15}
                    className="w-full px-4 py-3 placeholder:text-gray-400 text-gray-600 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none transition-all"
                  />

                  <textarea
                    placeholder="Ex: Rua das Flores, 123, casa da Maria"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    required
                    rows={2}
                    className="w-full px-4 py-3 placeholder:text-gray-400 text-gray-600 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none resize-none transition-all"
                  />

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PIX')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${paymentMethod === 'PIX'
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DINHEIRO')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${paymentMethod === 'DINHEIRO'
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Dinheiro
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'DINHEIRO' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Troco para quanto?</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.00"
                        value={changeAmount}
                        onChange={e => setChangeAmount(e.target.value)}
                        className="placeholder:text-gray-400 w-full px-4 py-3 border-2 text-green-700 font-bold border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none transition-all"
                      />
                    </div>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeNotifications}
                      onChange={e => setAgreeNotifications(e.target.checked)}
                      required
                      className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      Aceito receber notificações sobre meu pedido via WhatsApp
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-red-500 text-white font-bold text-lg rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <Check size={24} />
                        Finalizar Pedido
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col items-center">
              <h1 className="text-2xl md:text-3xl font-bold text-red-500">🍔 Pede Aqui!</h1>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-xl"
            >
              <ShoppingCart size={24} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="placeholder-gray-400 text-gray-900 w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
            />
          </div>
        </div>

        {/* Categorias */}
        <div className="overflow-x-auto px-4 pb-3 hide-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-5 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === null
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === category.id
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Produtos */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {searchedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400" size={48} />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Nenhum produto encontrado</p>
            <p className="text-gray-500">Tente buscar por outro termo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchedProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-[1.02]"
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-green-600">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}