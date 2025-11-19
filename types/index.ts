// Tipos principais do sistema

export type PaymentMethod = 'PIX' | 'DINHEIRO';

export type OrderStatus = 'NOVO' | 'EM_PREPARACAO' | 'SAIU_PARA_ENTREGA' | 'CONCLUIDO';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  items: OrderItem[];
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  change_amount?: number; // Para pagamento em dinheiro
  pix_qr_code?: string; // Para pagamento via PIX
  created_at: string;
  updated_at: string;
}

export interface FinancialReport {
  period_start: string;
  period_end: string;
  total_orders: number;
  total_revenue: number;
  pix_revenue: number;
  cash_revenue: number;
  orders: Order[];
}

