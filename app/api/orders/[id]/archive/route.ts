// app/api/orders/[id]/archive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ is_hidden: true })
    .eq("id", orderId);

  if (error) {
    console.error("Erro ao arquivar pedido:", error);
    return NextResponse.json({ error: "Erro ao arquivar pedido" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}