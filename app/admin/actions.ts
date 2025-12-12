// app/admin/actions.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ContactLead {
  id: string;
  name: string;
  business_name: string;
  phone: string;
  email: string;
}

export async function approveLeadAndCreateUser(lead: ContactLead) {
  // Usamos o server client, que pode usar segredos de ambiente com segurança
  const supabase = await createClient(); // Cliente padrão para o usuário logado
  const adminClient = supabaseAdmin; // Cliente com privilégios de admin

  // Idealmente, todo este bloco deveria ser uma única transação no banco.
  // Uma função RPC no Supabase seria a forma mais robusta de garantir isso.
  // Por enquanto, vamos executar os passos sequencialmente.

  try {
    // 1. Gerar um slug único para o novo tenant
    const { data: slugData, error: slugError } = await adminClient.rpc(
      "generate_unique_slug",
      { business_name: lead.business_name }
    );

    if (slugError) {
      throw new Error(`Erro ao gerar slug: ${slugError.message}`);
    }
    const slug = slugData;

    // 2. Criar o usuário na autenticação do Supabase
    // A senha é temporária e o usuário será forçado a trocá-la
    const { data: user, error: userError } =
      await adminClient.auth.admin.createUser({ // A resposta é { data: { user: User }, error }
        email: lead.email,
        email_confirm: true, // Marcar o e-mail como confirmado
      });

    if (userError) {
      throw new Error(`Erro ao criar usuário: ${userError.message}`);
    }
    if (!user || !user.user) {
      // Adicionando uma verificação extra para garantir que o usuário foi criado
      throw new Error("A criação do usuário não retornou os dados esperados.");
    }

    // 3. Criar o tenant no banco de dados
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        business_name: lead.business_name,
        slug: slug,
        owner_name: lead.name,
        owner_email: lead.email,
        owner_phone: lead.phone,
        status: "ACTIVE",
        plan: "FREE", // ou o plano inicial que desejar
        whatsapp_number: lead.phone,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tenantError) {
      // Se a criação do tenant falhar, devemos deletar o usuário recém-criado
      await adminClient.auth.admin.deleteUser(user.user.id);
      throw new Error(`Erro ao criar tenant: ${tenantError.message}`);
    }

    // 4. Associar o novo usuário ao novo tenant como 'OWNER'
    const { error: tenantUserError } = await adminClient
      .from("tenant_users")
      .insert({
        tenant_id: tenant.id,
        user_id: user.user.id,
        role: "OWNER",
      });

    if (tenantUserError) {
      // Se a associação falhar, deletamos o usuário e o tenant para manter a consistência
      await adminClient.auth.admin.deleteUser(user.user.id);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      throw new Error(
        `Erro ao associar usuário ao tenant: ${tenantUserError.message}`
      );
    }

    // 5. Atualizar o status do lead para 'CONVERTIDO'
    const { error: leadUpdateError } = await adminClient
      .from("contact_leads")
      .update({ status: "CONVERTIDO" })
      .eq("id", lead.id);

    if (leadUpdateError) {
      // Este erro é menos crítico, então apenas logamos em vez de reverter tudo
      console.error(
        "Erro ao atualizar status do lead:",
        leadUpdateError.message
      );
    }

    // 6. Gerar link para definição de senha e enviar e-mail
    // A URL de redirecionamento DEVE ser absoluta.
    // Em um ambiente de produção, substitua o localhost pela sua URL de produção.
    // O ideal é usar uma variável de ambiente, ex: process.env.NEXT_PUBLIC_SITE_URL
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/update-password`;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery", // Gera um link de recuperação de senha
        email: lead.email,
        options: {
          redirectTo,
        }
      });

    if (linkError) {
      // Logamos o erro, mas o processo principal foi um sucesso
      console.error("Erro ao gerar link de recuperação:", linkError.message);
      // Mesmo com erro no e-mail, a conta foi criada.
      // O admin pode reenviar o link manualmente se necessário.
    }

    // O Supabase enviará o e-mail automaticamente se os templates estiverem configurados.
    // Se você usa um serviço de e-mail externo (Resend, SendGrid),
    // aqui seria o local para chamá-lo usando o `linkData.properties.action_link`.

    // Força a revalidação dos dados no painel de admin
    revalidatePath("/admin");

    return {
      success: true,
      message: `✅ Conta para ${lead.business_name} criada com sucesso! Um e-mail para definição de senha foi enviado para ${lead.email}.`,
    };
  } catch (error: any) {
    console.error("Falha no processo de aprovação:", error);
    return {
      success: false,
      message: `Falha no processo de aprovação: ${error.message}`,
    };
  }
}
