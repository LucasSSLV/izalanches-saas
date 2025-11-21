// app/api/orders/archive-all-completed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ is_hidden: true })
    .eq("status", 'CONCLUIDO')
    .eq("is_hidden", false);

  if (error) {
    console.error("Erro ao arquivar todos os pedidos concluídos:", error);
    return NextResponse.json({ error: "Erro ao arquivar pedidos" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}