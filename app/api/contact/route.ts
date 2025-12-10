// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ContactRequest {
  name: string;
  business: string;
  phone: string;
  email: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  console.log("🔥 API /api/contact chamada!");

  try {
    const body: ContactRequest = await request.json();
    console.log("📦 Body recebido:", body);

    // Validação básica
    if (!body.name || !body.business || !body.phone || !body.email) {
      console.log("❌ Validação falhou: dados incompletos");
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      console.log("❌ Email inválido:", body.email);
      return NextResponse.json(
        { error: "E-mail inválido" },
        { status: 400 }
      );
    }

    // Validar formato do telefone (básico)
    const phoneClean = body.phone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      console.log("❌ Telefone inválido:", phoneClean);
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 }
      );
    }

    console.log("✅ Validação OK, criando cliente Supabase...");
    const supabase = await createClient();

    // Verificar se já existe um lead com esse email
    const { data: existingLead } = await supabase
      .from("contact_leads")
      .select("id, created_at")
      .eq("email", body.email)
      .single();

    if (existingLead) {
      console.log("⚠️ Lead já existe com este email:", body.email);
      
      // Atualizar o lead existente ao invés de criar duplicado
      const { data: updatedLead, error: updateError } = await supabase
        .from("contact_leads")
        .update({
          name: body.name,
          business_name: body.business,
          phone: phoneClean,
          message: body.message || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Erro ao atualizar lead:", updateError);
        return NextResponse.json(
          { error: "Erro ao atualizar informações do lead" },
          { status: 500 }
        );
      }

      console.log("✅ Lead atualizado:", updatedLead.id);
      
      return NextResponse.json({
        success: true,
        leadId: updatedLead.id,
        message: "Suas informações foram atualizadas com sucesso!",
        updated: true,
      });
    }

    // Criar novo lead
    console.log("📝 Inserindo novo lead no banco...");
    const { data: lead, error: leadError } = await supabase
      .from("contact_leads")
      .insert({
        name: body.name,
        business_name: body.business,
        phone: phoneClean,
        email: body.email,
        message: body.message || null,
        status: "NOVO",
      })
      .select()
      .single();

    if (leadError || !lead) {
      console.error("❌ Erro ao criar lead:", leadError);
      return NextResponse.json(
        { error: "Erro ao salvar informações de contato" },
        { status: 500 }
      );
    }

    console.log("✅ Lead criado:", lead.id);

    // OPCIONAL: Enviar notificação interna (email/WhatsApp) para a equipe
    // Você pode descomentar isso e configurar depois
    /*
    try {
      await notifyTeamAboutNewLead({
        leadId: lead.id,
        name: body.name,
        business: body.business,
        phone: phoneClean,
        email: body.email,
      });
      console.log("✅ Equipe notificada sobre novo lead");
    } catch (notificationError) {
      console.error("⚠️ Erro ao notificar equipe:", notificationError);
      // Não falha a requisição se a notificação falhar
    }
    */

    console.log("🎉 Processo completo! Lead salvo com sucesso");
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: "Mensagem enviada com sucesso! Em breve entraremos em contato.",
    });
  } catch (error) {
    console.error("❌ Erro geral ao processar contato:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// Opcional: método GET para verificar status da API
export async function GET() {
  return NextResponse.json({
    message: "API de contato está funcionando!",
    method: "Use POST para enviar formulário de contato",
  });
}

// Função auxiliar para notificar a equipe (OPCIONAL)
/*
async function notifyTeamAboutNewLead(lead: {
  leadId: string;
  name: string;
  business: string;
  phone: string;
  email: string;
}) {
  // Exemplo: Enviar WhatsApp para número da equipe
  const teamPhone = process.env.TEAM_NOTIFICATION_PHONE;
  
  if (!teamPhone) {
    console.log("⚠️ Número da equipe não configurado");
    return;
  }

  const message = `
🎉 *Novo Lead Recebido!*

👤 *Nome:* ${lead.name}
🏢 *Estabelecimento:* ${lead.business}
📱 *Telefone:* ${lead.phone}
📧 *Email:* ${lead.email}

Acesse o painel para mais detalhes.
  `.trim();

  // Usar a API de WhatsApp para notificar
  // await sendWhatsAppMessage(teamPhone, message);
}
*/