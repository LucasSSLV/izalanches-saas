import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to generate a unique slug
const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export async function POST(request: Request) {
    const { lead } = await request.json();

    if (!lead || !lead.id || !lead.email || !lead.business_name) {
        return NextResponse.json({ error: 'Dados do lead incompletos.' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Validar se o usuário que faz a requisição é admin
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
        return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
    }

    const { data: isAdmin, error: isAdminError } = await supabase.rpc('is_admin');
    if (isAdminError || !isAdmin) {
        return NextResponse.json({ error: 'Acesso negado. Requer privilégios de administrador.' }, { status: 403 });
    }

    let tenantId: string | null = null;

    try {
        // 2. Criar o tenant primeiro para obter o seu ID
        const slug = generateSlug(lead.business_name);
        const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                business_name: lead.business_name,
                slug: slug,
                owner_name: lead.name,
                owner_email: lead.email,
                owner_phone: lead.phone,
                status: 'ACTIVE',
                plan: 'FREE', // Plano padrão
                whatsapp_number: lead.phone,
            })
            .select('id')
            .single();

        if (tenantError) {
            console.error('Erro ao criar tenant:', tenantError);
            // Verifica se o erro é de slug duplicado para dar uma mensagem mais clara
            if (tenantError.code === '23505') { // unique_violation
                 return NextResponse.json({ error: `O nome de negócio "${lead.business_name}" já está em uso.` }, { status: 409 });
            }
            return NextResponse.json({ error: `Falha ao criar o tenant: ${tenantError.message}` }, { status: 500 });
        }

        tenantId = newTenant.id;

        // 3. Convidar o usuário por e-mail, associando o tenant_id nos metadados
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            lead.email,
            {
                data: {
                    tenant_id: tenantId,
                    full_name: lead.name, // Adiciona o nome do usuário aos metadados
                }
            }
        );

        if (inviteError) {
            console.error('Erro ao convidar usuário:', inviteError);
            // Se o convite falhar, o tenant criado é excluído para evitar inconsistência.
            if (tenantId) {
                await supabase.from('tenants').delete().eq('id', tenantId);
            }
            return NextResponse.json({ error: `Falha ao enviar convite para o usuário: ${inviteError.message}` }, { status: 500 });
        }
        
        // 4. Associar o user_id recém-criado ao tenant
        // A trigger `public.handle_new_user` já faz isso automaticamente.

        // 5. Atualizar o status do lead para 'CONVERTIDO'
        const { error: leadUpdateError } = await supabase
            .from('contact_leads')
            .update({ status: 'CONVERTIDO' })
            .eq('id', lead.id);

        if (leadUpdateError) {
            // Apenas loga o erro, pois as partes críticas (tenant e usuário) foram concluídas.
            console.error('Erro ao atualizar status do lead:', leadUpdateError);
        }

        // 6. Retornar sucesso
        return NextResponse.json({
            message: `Tenant criado e convite enviado com sucesso para ${lead.email}!`,
        });

    } catch (error: any) {
        console.error('Erro inesperado no processo de aprovação:', error);
        
        // Se algo der errado e um tenant foi criado, tenta deletá-lo.
        if (tenantId) {
            await supabase.from('tenants').delete().eq('id', tenantId);
        }
        
        return NextResponse.json({ error: 'Ocorreu um erro inesperado.' }, { status: 500 });
    }
}
