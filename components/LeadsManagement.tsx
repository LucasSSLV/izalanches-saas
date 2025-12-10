'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ContactLead, LeadStatus } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    User,
    Building2,
    Phone,
    Mail,
    MessageSquare,
    Calendar,
    Edit,
    Save,
    X,
    Filter,
    Search
} from 'lucide-react';

const STATUS_LABELS: Record<LeadStatus, string> = {
    NOVO: 'Novo',
    EM_CONTATO: 'Em Contato',
    CONVERTIDO: 'Convertido',
    PERDIDO: 'Perdido',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
    NOVO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    EM_CONTATO: 'bg-blue-100 text-blue-800 border-blue-300',
    CONVERTIDO: 'bg-green-100 text-green-800 border-green-300',
    PERDIDO: 'bg-red-100 text-red-800 border-red-300',
};

export default function LeadsManagement() {
    const [leads, setLeads] = useState<ContactLead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<ContactLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'TODOS'>('TODOS');
    const [searchTerm, setSearchTerm] = useState('');

    const supabase = createClient();

    useEffect(() => {
        loadLeads();
        subscribeToLeads();
    }, []);

    useEffect(() => {
        filterLeads();
    }, [leads, filterStatus, searchTerm]);

    async function loadLeads() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('contact_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar leads:', error);
                return;
            }

            if (data) {
                setLeads(data);
            }
        } catch (error) {
            console.error('Erro ao carregar leads:', error);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToLeads() {
        const channel = supabase
            .channel('contact_leads_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contact_leads',
                },
                (payload) => {
                    console.log('Mudança detectada em leads:', payload);
                    loadLeads();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }

    function filterLeads() {
        let filtered = leads;

        // Filtrar por status
        if (filterStatus !== 'TODOS') {
            filtered = filtered.filter(lead => lead.status === filterStatus);
        }

        // Filtrar por termo de busca
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(lead =>
                lead.name.toLowerCase().includes(term) ||
                lead.business_name.toLowerCase().includes(term) ||
                lead.email.toLowerCase().includes(term) ||
                lead.phone.includes(term)
            );
        }

        setFilteredLeads(filtered);
    }

    async function updateLeadStatus(leadId: string, newStatus: LeadStatus) {
        try {
            const { error } = await supabase
                .from('contact_leads')
                .update({ status: newStatus })
                .eq('id', leadId);

            if (error) {
                console.error('Erro ao atualizar status:', error);
                alert('Erro ao atualizar status do lead');
                return;
            }

            // Atualizar localmente
            setLeads(prev =>
                prev.map(lead =>
                    lead.id === leadId ? { ...lead, status: newStatus } : lead
                )
            );

            if (selectedLead?.id === leadId) {
                setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    }

    async function saveNotes() {
        if (!selectedLead) return;

        try {
            const { error } = await supabase
                .from('contact_leads')
                .update({ notes })
                .eq('id', selectedLead.id);

            if (error) {
                console.error('Erro ao salvar notas:', error);
                alert('Erro ao salvar notas');
                return;
            }

            // Atualizar localmente
            setLeads(prev =>
                prev.map(lead =>
                    lead.id === selectedLead.id ? { ...lead, notes } : lead
                )
            );

            setSelectedLead(prev => prev ? { ...prev, notes } : null);
            setEditingNotes(false);
        } catch (error) {
            console.error('Erro ao salvar notas:', error);
        }
    }

    function openLeadDetails(lead: ContactLead) {
        setSelectedLead(lead);
        setNotes(lead.notes || '');
        setEditingNotes(false);
    }

    const stats = {
        total: leads.length,
        novos: leads.filter(l => l.status === 'NOVO').length,
        emContato: leads.filter(l => l.status === 'EM_CONTATO').length,
        convertidos: leads.filter(l => l.status === 'CONVERTIDO').length,
        perdidos: leads.filter(l => l.status === 'PERDIDO').length,
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestão de Leads</h2>

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
                    <p className="text-sm text-gray-600">Em Contato</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.emContato}</p>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Convertidos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.convertidos}</p>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Perdidos</p>
                    <p className="text-2xl font-bold text-red-600">{stats.perdidos}</p>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, empresa, email ou telefone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 placeholder:text-gray-400"
                        />
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex items-center gap-2">
                        <Filter className="text-gray-400" size={20} />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as LeadStatus | 'TODOS')}
                            className="flex-1 px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700"
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="NOVO">Novos</option>
                            <option value="EM_CONTATO">Em Contato</option>
                            <option value="CONVERTIDO">Convertidos</option>
                            <option value="PERDIDO">Perdidos</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de Leads */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Carregando leads...</p>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <User className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-900 mb-2">Nenhum lead encontrado</p>
                    <p className="text-gray-600">
                        {searchTerm || filterStatus !== 'TODOS'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Aguarde novos contatos através da landing page'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                        Data
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                        Nome / Empresa
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                        Contato
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold text-purple-800">{lead.name}</div>
                                                <div className="text-sm text-gray-600">{lead.business_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <Phone size={14} className="text-gray-400" />
                                                    <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                                        {lead.phone}
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <Mail size={14} className="text-gray-400" />
                                                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                                                        {lead.email}
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.status}
                                                onChange={e => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[lead.status]} cursor-pointer`}
                                            >
                                                <option value="NOVO">Novo</option>
                                                <option value="EM_CONTATO">Em Contato</option>
                                                <option value="CONVERTIDO">Convertido</option>
                                                <option value="PERDIDO">Perdido</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => openLeadDetails(lead)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Detalhes do Lead</h3>
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={selectedLead.status}
                                    onChange={e => updateLeadStatus(selectedLead.id, e.target.value as LeadStatus)}
                                    className={`w-full px-4 py-2 rounded-lg border-2 font-semibold ${STATUS_COLORS[selectedLead.status]}`}
                                >
                                    <option value="NOVO">Novo</option>
                                    <option value="EM_CONTATO">Em Contato</option>
                                    <option value="CONVERTIDO">Convertido</option>
                                    <option value="PERDIDO">Perdido</option>
                                </select>
                            </div>

                            {/* Informações Pessoais */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User className="inline mr-2" size={16} />
                                        Nome
                                    </label>
                                    <p className="text-gray-900 font-semibold">{selectedLead.name}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Building2 className="inline mr-2" size={16} />
                                        Estabelecimento
                                    </label>
                                    <p className="text-gray-900 font-semibold">{selectedLead.business_name}</p>
                                </div>
                            </div>

                            {/* Contato */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Phone className="inline mr-2" size={16} />
                                        Telefone
                                    </label>
                                    <a
                                        href={`tel:${selectedLead.phone}`}
                                        className="text-blue-600 hover:text-blue-700 font-semibold"
                                    >
                                        {selectedLead.phone}
                                    </a>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Mail className="inline mr-2" size={16} />
                                        E-mail
                                    </label>
                                    <a
                                        href={`mailto:${selectedLead.email}`}
                                        className="text-blue-600 hover:text-blue-700 font-semibold"
                                    >
                                        {selectedLead.email}
                                    </a>
                                </div>
                            </div>

                            {/* Mensagem */}
                            {selectedLead.message && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <MessageSquare className="inline mr-2" size={16} />
                                        Mensagem
                                    </label>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-700">{selectedLead.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Data */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline mr-2" size={16} />
                                    Data de Cadastro
                                </label>
                                <p className="text-gray-900">
                                    {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>

                            {/* Notas Internas */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Notas Internas
                                    </label>
                                    {!editingNotes && (
                                        <button
                                            onClick={() => setEditingNotes(true)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                        >
                                            <Edit size={14} />
                                            Editar
                                        </button>
                                    )}
                                </div>

                                {editingNotes ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all text-gray-700"
                                            placeholder="Adicione anotações sobre este lead..."
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveNotes}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                <Save size={16} />
                                                Salvar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingNotes(false);
                                                    setNotes(selectedLead.notes || '');
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50 rounded-lg min-h-[100px]">
                                        {selectedLead.notes ? (
                                            <p className="text-gray-700 whitespace-pre-wrap">{selectedLead.notes}</p>
                                        ) : (
                                            <p className="text-gray-400 italic">Nenhuma anotação adicionada</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}