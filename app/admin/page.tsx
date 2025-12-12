'use client';

// import {Toast, toast} from 'sonner'
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    Store,
    Users,
    DollarSign,
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    Phone,
    Calendar,
    Edit,
    Ban,
    Trash2,
    Search,
    Filter,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { approveLeadAndCreateUser } from './actions';
import toast from 'react-hot-toast';


interface Tenant {
    id: string;
    business_name: string;
    slug: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    plan: string;
    created_at: string;
    approved_at: string | null;
}

interface ContactLead {
    id: string;
    name: string;
    business_name: string;
    phone: string;
    email: string;
    message: string | null;
    status: string;
    created_at: string;
}

const STATUS_LABELS = {
    PENDING: 'Pendente',
    ACTIVE: 'Ativo',
    SUSPENDED: 'Suspenso',
    CANCELLED: 'Cancelado',
};

const STATUS_COLORS = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ACTIVE: 'bg-green-100 text-green-800 border-green-300',
    SUSPENDED: 'bg-red-100 text-red-800 border-red-300',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function AdminDashboard() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [leads, setLeads] = useState<ContactLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tenants' | 'leads'>('leads');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        checkAdminAccess();
        loadData();
    }, []);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        const { data: isAdmin, error } = await supabase.rpc('is_admin');

        if (error || !isAdmin) {
            // Se não for admin, redireciona para o painel de tenant
            // ou uma página de "acesso negado".
            router.push('/painel');
            return;
        }
    }

    async function loadData() {
        setLoading(true);
        try {
            await Promise.all([loadTenants(), loadLeads()]);
        } finally {
            setLoading(false);
        }
    }

    async function loadTenants() {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setTenants(data);
        }
    }

    async function loadLeads() {
        const { data, error } = await supabase
            .from('contact_leads')
            .select('*')
            .eq('status', 'NOVO')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setLeads(data);
        }
    }

    async function approveLead(lead: ContactLead) {
        if (!confirm(`Aprovar e criar conta para ${lead.business_name}?`)) return;
        toast.promise(approveLeadAndCreateUser(lead), {
            loading: `Aprovando ${lead.business_name}...`,
            success: (result) => {
                if (result.success) {
                    loadData();
                    setSelectedLead(null);
                    return result.message;
                } else {
                    throw new Error(result.message);
                }
            },
            error: (err) => err.message,
        });
    }

    async function rejectLead(lead: ContactLead) {
        if (!confirm(`Rejeitar solicitação de ${lead.business_name}?`)) return;

        const { error } = await supabase
            .from('contact_leads')
            .update({ status: 'PERDIDO' })
            .eq('id', lead.id);
        if (error) {
            toast.error('Erro ao rejeitar lead: ' + error.message);
        } else {
            toast.success('Lead rejeitado com sucesso.');
            loadData();
            setSelectedLead(null);
        }
    }
    
    async function updateTenantStatus(tenantId: string, newStatus: string) {
        const { error } = await supabase
            .from('tenants')
            .update({ status: newStatus })
            .eq('id', tenantId);

        if (error) {
            toast.error('Erro ao atualizar status: ' + error.message);
        } else {
            toast.success('Status atualizado com sucesso!');
            loadData();
        }
    }

    const stats = {
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.status === 'ACTIVE').length,
        pendingTenants: tenants.filter(t => t.status === 'PENDING').length,
        pendingLeads: leads.length,
    };

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.owner_email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'ALL' || tenant.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">
                        Carregando...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">🔐 Painel Admin</h1>
                            <p className="text-gray-600">Gestão de tenants e aprovações</p>
                        </div>
                        <button
                            onClick={() => router.push('/painel')}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Voltar ao Painel
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3">
                            <Store className="text-blue-600" size={32} />
                            <div>
                                <p className="text-sm text-gray-600">Total de Tenants</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-lg shadow p-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-600" size={32} />
                            <div>
                                <p className="text-sm text-gray-600">Tenants Ativos</p>
                                <p className="text-2xl font-bold text-green-600">{stats.activeTenants}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg shadow p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="text-yellow-600" size={32} />
                            <div>
                                <p className="text-sm text-gray-600">Aguardando Aprovação</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pendingTenants}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg shadow p-6">
                        <div className="flex items-center gap-3">
                            <Users className="text-purple-600" size={32} />
                            <div>
                                <p className="text-sm text-gray-600">Novos Leads</p>
                                <p className="text-2xl font-bold text-purple-600">{stats.pendingLeads}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('leads')}
                            className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'leads'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Leads Pendentes ({leads.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('tenants')}
                            className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'tenants'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Todos os Tenants ({tenants.length})
                        </button>
                    </div>

                    {/* Leads Tab */}
                    {activeTab === 'leads' && (
                        <div className="p-6">
                            {leads.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="mx-auto text-gray-400 mb-4" size={48} />
                                    <p className="text-lg font-semibold text-gray-900 mb-2">Nenhum lead pendente</p>
                                    <p className="text-gray-600">Novos leads aparecerão aqui</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {leads.map(lead => (
                                        <div key={lead.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900">{lead.business_name}</h3>
                                                    <p className="text-gray-700 mb-2">{lead.name}</p>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Mail size={14} />
                                                            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                                                                {lead.email}
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Phone size={14} />
                                                            <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                                                {lead.phone}
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Calendar size={14} />
                                                            {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </div>
                                                    </div>

                                                    {lead.message && (
                                                        <div className="mt-3 p-3 bg-white rounded border">
                                                            <p className="text-sm text-gray-700">{lead.message}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 ml-4">
                                                    <button
                                                        onClick={() => approveLead(lead)}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => rejectLead(lead)}
                                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                                    >
                                                        <XCircle size={16} />
                                                        Rejeitar
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedLead(lead)}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                                    >
                                                        <Eye size={16} />
                                                        Detalhes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tenants Tab */}
                    {activeTab === 'tenants' && (
                        <div className="p-6">
                            {/* Filtros */}
                            <div className="mb-6 grid md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, email..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="text-gray-400" size={20} />
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="flex-1 px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="ALL">Todos os Status</option>
                                        <option value="ACTIVE">Ativos</option>
                                        <option value="PENDING">Pendentes</option>
                                        <option value="SUSPENDED">Suspensos</option>
                                        <option value="CANCELLED">Cancelados</option>
                                    </select>
                                </div>
                            </div>

                            {/* Lista de Tenants */}
                            {filteredTenants.length === 0 ? (
                                <div className="text-center py-12">
                                    <Store className="mx-auto text-gray-400 mb-4" size={48} />
                                    <p className="text-lg font-semibold text-gray-900 mb-2">Nenhum tenant encontrado</p>
                                    <p className="text-gray-600">Ajuste os filtros de busca</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Lanchonete</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Responsável</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Slug</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Plano</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criado em</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredTenants.map(tenant => (
                                                <tr key={tenant.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{tenant.business_name}</div>
                                                        <div className="text-sm text-gray-600">{tenant.owner_email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <div className="font-medium text-gray-900">{tenant.owner_name}</div>
                                                            <div className="text-gray-600">{tenant.owner_phone}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                                                            {tenant.slug}
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={tenant.status}
                                                            onChange={e => updateTenantStatus(tenant.id, e.target.value)}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${STATUS_COLORS[tenant.status]}`}
                                                        >
                                                            <option value="PENDING">Pendente</option>
                                                            <option value="ACTIVE">Ativo</option>
                                                            <option value="SUSPENDED">Suspenso</option>
                                                            <option value="CANCELLED">Cancelado</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                                            {tenant.plan}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => setSelectedTenant(tenant)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                                                        >
                                                            Ver Detalhes
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalhes do Tenant */}
            {selectedTenant && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Detalhes do Tenant</h3>
                            <button
                                onClick={() => setSelectedTenant(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Informações do Negócio</h4>
                                <div className="space-y-2">
                                    <p><strong>Nome:</strong> {selectedTenant.business_name}</p>
                                    <p><strong>Slug:</strong> <code className="px-2 py-1 bg-gray-100 rounded">{selectedTenant.slug}</code></p>
                                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[selectedTenant.status]}`}>
                                        {STATUS_LABELS[selectedTenant.status]}
                                    </span></p>
                                    <p><strong>Plano:</strong> {selectedTenant.plan}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Responsável</h4>
                                <div className="space-y-2">
                                    <p><strong>Nome:</strong> {selectedTenant.owner_name}</p>
                                    <p><strong>Email:</strong> <a href={`mailto:${selectedTenant.owner_email}`} className="text-blue-600 hover:text-blue-700">{selectedTenant.owner_email}</a></p>
                                    <p><strong>Telefone:</strong> <a href={`tel:${selectedTenant.owner_phone}`} className="text-blue-600 hover:text-blue-700">{selectedTenant.owner_phone}</a></p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Datas</h4>
                                <div className="space-y-2">
                                    <p><strong>Criado em:</strong> {format(new Date(selectedTenant.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    {selectedTenant.approved_at && (
                                        <p><strong>Aprovado em:</strong> {format(new Date(selectedTenant.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.open(`/cardapio/${selectedTenant.slug}`, '_blank')}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Ver Cardápio
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Suspender este tenant?')) {
                                            updateTenantStatus(selectedTenant.id, 'SUSPENDED');
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Ban size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Lead */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Detalhes do Lead</h3>
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <strong>Estabelecimento:</strong> {selectedLead.business_name}
                            </div>
                            <div>
                                <strong>Nome:</strong> {selectedLead.name}
                            </div>
                            <div>
                                <strong>Email:</strong> <a href={`mailto:${selectedLead.email}`} className="text-blue-600">{selectedLead.email}</a>
                            </div>
                            <div>
                                <strong>Telefone:</strong> <a href={`tel:${selectedLead.phone}`} className="text-blue-600">{selectedLead.phone}</a>
                            </div>
                            {selectedLead.message && (
                                <div>
                                    <strong>Mensagem:</strong>
                                    <p className="mt-2 p-3 bg-gray-50 rounded">{selectedLead.message}</p>
                                </div>
                            )}
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => approveLead(selectedLead)}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <CheckCircle className="inline mr-2" size={16} />
                                    Aprovar
                                </button>
                                <button
                                    onClick={() => rejectLead(selectedLead)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <XCircle className="inline mr-2" size={16} />
                                    Rejeitar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}