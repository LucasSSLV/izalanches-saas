// app/api/notification-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Busca a configuração mais recente
export async function GET(request: NextRequest) {
  console.log("🔥 API /api/notification-settings GET chamada!");
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Se o erro for "PGRST116", significa que não há linhas, o que é esperado na primeira vez.
      // Retornamos as configurações padrão nesse caso.
      if (error.code === 'PGRST116') {
        console.log("🤔 Nenhuma configuração encontrada, retornando padrão.");
        return NextResponse.json({
            send_order_confirmation: true,
            send_preparation_notice: false,
            send_delivery_notice: true,
            send_completion_notice: false,
        });
      }
      console.error("❌ Erro ao buscar configurações:", error);
      throw error;
    }

    console.log("✅ Configurações encontradas:", data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar configurações." },
      { status: 500 }
    );
  }
}

// POST - Cria ou atualiza a configuração
export async function POST(request: NextRequest) {
  console.log("🔥 API /api/notification-settings POST chamada!");
  try {
    const body = await request.json();
    console.log("📦 Body recebido:", body);

    const supabase = await createClient();

    // Como queremos apenas uma linha de configuração, vamos deletar as antigas
    // e inserir a nova. É mais simples que um upsert complexo para garantir uma única linha.
    const { error: deleteError } = await supabase.from('notification_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
    
    if (deleteError) {
        console.error("❌ Erro ao limpar configurações antigas:", deleteError);
        throw deleteError;
    }

    const { data, error: insertError } = await supabase
      .from("notification_settings")
      .insert({
        send_order_confirmation: body.send_order_confirmation,
        send_preparation_notice: body.send_preparation_notice,
        send_delivery_notice: body.send_delivery_notice,
        send_completion_notice: body.send_completion_notice,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao salvar configurações:", insertError);
      throw insertError;
    }

    console.log("✅ Configurações salvas com sucesso:", data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor ao salvar configurações." },
      { status: 500 }
    );
  }
}
