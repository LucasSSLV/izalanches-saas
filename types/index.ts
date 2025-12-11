// Tipos principais do sistema

export type PaymentMethod = "PIX" | "DINHEIRO";

export type OrderStatus =
  | "NOVO"
  | "EM_PREPARACAO"
  | "SAIU_PARA_ENTREGA"
  | "CONCLUIDO";

export type LeadStatus = "NOVO" | "EM_CONTATO" | "CONVERTIDO" | "PERDIDO";

export type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export type TenantPlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

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
  tenant_id: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  tenant_id: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  subtotal: number;
  tenant_id?: string;
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
  change_amount?: number;
  pix_qr_code?: string;
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
  tenant_id: string;
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

export interface ContactLead {
  id: string;
  name: string;
  business_name: string;
  phone: string;
  email: string;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  primary_color: string;
  whatsapp_number: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  invited_by: string | null;
}