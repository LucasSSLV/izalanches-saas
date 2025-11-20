// app/painel/configuracoes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { calculateMonthlySavings } from '@/lib/notifications/whatsapp';
import { Bell, BellOff, DollarSign, MessageSquare, TrendingDown, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface NotificationSettings {
    send_order_confirmation: boolean;
    send_preparation_notice: boolean;
    send_delivery_notice: boolean;
    send_completion_notice: boolean;
}

type LoadingStatus = 'idle' | 'loading' | 'saving' | 'success' | 'error';

export default function ConfiguracoesPage() {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [monthlyOrders, setMonthlyOrders] = useState(3000);
    const [status, setStatus] = useState<LoadingStatus>('loading');

    useEffect(() => {
        async function fetchSettings() {
            setStatus('loading');
            try {
                const response = await fetch('/api/notification-settings');
                if (!response.ok) throw new Error('Falha ao buscar configurações');
                const data = await response.json();
                setSettings(data);
                setStatus('idle');
            } catch (error) {
                console.error(error);
                setStatus('error');
            }
        }
        fetchSettings();
    }, []);

    const stats = settings ? calculateMonthlySavings(monthlyOrders, {
        sendOrderConfirmation: settings.send_order_confirmation,
        sendPreparationNotice: settings.send_preparation_notice,
        sendDeliveryNotice: settings.send_delivery_notice,
        sendCompletionNotice: settings.send_completion_notice,
    }) : null;

    function toggleSetting(key: keyof NotificationSettings) {
        if (!settings) return;
        setSettings(prev => ({
            ...prev!,
            [key]: !prev![key],
        }));
    }

    async function handleSave() {
        if (!settings) return;
        setStatus('saving');
        try {
            const response = await fetch('/api/notification-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error('Falha ao salvar configurações');
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000); // Reset status after 2s
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    }

    const notificationOptions = [
        {
            key: 'send_order_confirmation' as keyof NotificationSettings,
            title: '✅ Confirmação de Pedido',
            description: 'Enviada assim que o cliente finaliza o pedido no site',
            recommended: true,
            essential: true,
            example: '✅ Pedido Recebido! Seu pedido #ABC123 foi confirmado...',
        },
        {
            key: 'send_preparation_notice' as keyof NotificationSettings,
            title: '🧑‍🍳 Pedido em Preparo',
            description: 'Enviada quando atendente move para "Em Preparação"',
            recommended: false,
            essential: false,
            example: '🧑‍🍳 Estamos preparando seu pedido com todo carinho!',
        },
        {
            key: 'send_delivery_notice' as keyof NotificationSettings,
            title: '🚚 Saiu para Entrega',
            description: 'Enviada quando pedido sai para entrega',
            recommended: true,
            essential: true,
            example: '🚚 Seu pedido saiu para entrega! Em breve estará aí.',
        },
        {
            key: 'send_completion_notice' as keyof NotificationSettings,
            title: '📦 Pronto para Retirada',
            description: 'Enviada quando pedido é movido para "Concluído" (apenas retirada)',
            recommended: false,
            essential: false,
            example: '✅ Seu pedido está pronto! Pode vir buscar.',
        },
    ];

    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (status === 'error' || !settings) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 text-center">
                <AlertTriangle className="text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-800">Erro ao carregar configurações</h2>
                <p className="text-gray-600">Por favor, tente recarregar a página.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    ⚙️ Configurações de Notificações
                </h1>
                <p className="text-gray-600 mb-8">
                    Otimize seus custos com WhatsApp Business API controlando quais notificações enviar
                </p>

                {/* Cards de Estatísticas */}
                {stats && <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="text-blue-600" size={24} />
                            <h3 className="text-sm font-medium text-gray-600">Mensagens/Mês</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {stats.messagesWithConfig.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            vs {stats.messagesWithAll.toLocaleString()} (todas ativas)
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="text-green-600" size={24} />
                            <h3 className="text-sm font-medium text-gray-600">Custo/Mês</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            R$ {(stats.costWithConfig * 5.5).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            vs R$ {(stats.costWithAll * 5.5).toFixed(2)} (todas)
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="text-purple-600" size={24} />
                            <h3 className="text-sm font-medium text-gray-600">Economia/Mês</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                            R$ {(stats.savings * 5.5).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.costWithAll > 0 ? ((stats.savings / stats.costWithAll) * 100).toFixed(0) : 0}% de economia
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Bell className="text-orange-600" size={24} />
                            <h3 className="text-sm font-medium text-gray-600">Notificações Ativas</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {Object.values(settings).filter(Boolean).length}/4
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            tipos de mensagem
                        </p>
                    </div>
                </div>}

                {/* Simulador */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📊 Simulador de Custos
                    </h3>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantos pedidos você espera por mês?
                    </label>
                    <input
                        type="number"
                        value={monthlyOrders}
                        onChange={(e) => setMonthlyOrders(parseInt(e.target.value) || 0)}
                        className="w-full max-w-xs px-4 py-2 border rounded-lg text-gray-900"
                        min="0"
                        step="100"
                    />
                </div>

                {/* Configurações de Notificações */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                        Tipos de Notificação
                    </h2>

                    <div className="space-y-4">
                        {notificationOptions.map((option) => (
                            <div
                                key={option.key}
                                className={`border-2 rounded-lg p-4 transition-all ${settings[option.key]
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {option.title}
                                            </h3>
                                            {option.essential && (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                                    ESSENCIAL
                                                </span>
                                            )}
                                            {option.recommended && !option.essential && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                                    RECOMENDADO
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            {option.description}
                                        </p>
                                        <div className="bg-white border border-gray-200 rounded p-3">
                                            <p className="text-xs font-mono text-gray-700">
                                                {option.example}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        <button
                                            onClick={() => toggleSetting(option.key)}
                                            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${settings[option.key]
                                                    ? 'bg-blue-600'
                                                    : 'bg-gray-300'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${settings[option.key]
                                                        ? 'translate-x-12'
                                                        : 'translate-x-1'
                                                    }`}
                                            >
                                                {settings[option.key] ? (
                                                    <Bell className="m-2 text-blue-600" size={24} />
                                                ) : (
                                                    <BellOff className="m-2 text-gray-400" size={24} />
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recomendações */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        💡 Nossa Recomendação (Melhor Custo-Benefício)
                    </h3>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">✅</span>
                            <div>
                                <strong>Confirmação de Pedido:</strong> ATIVAR - Cliente precisa saber que pedido foi recebido
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-600 mt-1">❌</span>
                            <div>
                                <strong>Pedido em Preparo:</strong> DESATIVAR - Economiza custos sem prejudicar experiência
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">✅</span>
                            <div>
                                <strong>Saiu para Entrega:</strong> ATIVAR - Cliente precisa se preparar para receber
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-600 mt-1">❌</span>
                            <div>
                                <strong>Pronto para Retirada:</strong> DESATIVAR - Use apenas se tiver muita retirada no local
                            </div>
                        </li>
                    </ul>

                    <div className="mt-6 p-4 bg-white rounded border border-green-300">
                        <p className="text-sm text-gray-700">
                            <strong>Com esta configuração recomendada:</strong><br />
                            Você envia apenas <strong>2 mensagens por pedido</strong> (confirmação + entrega),
                            economizando <strong>50% nos custos</strong> sem prejudicar a experiência do cliente.
                        </p>
                    </div>
                </div>

                {/* Botão Salvar */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={status === 'saving'}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-400"
                    >
                        {status === 'saving' && <Loader2 className="animate-spin" size={20} />}
                        {status === 'success' && <CheckCircle size={20} />}
                        {status !== 'saving' && status !== 'success' && '💾 Salvar Configurações'}
                        {status === 'success' && 'Salvo!'}
                    </button>
                </div>
            </div>
        </div>
    );
}