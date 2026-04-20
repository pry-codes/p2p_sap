export type PRStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted';
export type POStatus = 'open' | 'partially_delivered' | 'fully_delivered' | 'invoiced' | 'closed' | 'cancelled';
export type InvoiceStatus = 'parked' | 'posted' | 'paid' | 'blocked' | 'cancelled';
export type PaymentStatus = 'open' | 'partially_paid' | 'paid' | 'overdue';

export interface Vendor {
  id: string;
  vendor_number: string;
  name: string;
  country: string;
  city: string;
  street: string;
  payment_terms: string;
  currency: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  created_at: string;
}

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  title: string;
  requester: string;
  department: string;
  plant: string;
  status: PRStatus;
  priority: string;
  required_date: string | null;
  total_value: number;
  currency: string;
  notes: string;
  created_at: string;
  updated_at: string;
  pr_items?: PRItem[];
}

export interface PRItem {
  id: string;
  pr_id: string;
  item_number: number;
  material_number: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  material_group: string;
  delivery_date: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  pr_id: string | null;
  plant: string;
  purchasing_org: string;
  purchasing_group: string;
  status: POStatus;
  order_date: string;
  delivery_date: string | null;
  payment_terms: string;
  currency: string;
  total_net_value: number;
  total_tax: number;
  total_gross_value: number;
  notes: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  po_items?: POItem[];
  purchase_requisition?: PurchaseRequisition;
}

export interface POItem {
  id: string;
  po_id: string;
  pr_item_id: string | null;
  item_number: number;
  material_number: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  net_price: number;
  tax_code: string;
  tax_rate: number;
  delivery_date: string | null;
  received_quantity: number;
  invoiced_quantity: number;
  created_at: string;
}

export interface GoodsReceipt {
  id: string;
  gr_number: string;
  po_id: string;
  movement_type: string;
  posting_date: string;
  document_date: string;
  plant: string;
  storage_location: string;
  status: string;
  delivery_note: string;
  notes: string;
  total_value: number;
  currency: string;
  created_at: string;
  purchase_order?: PurchaseOrder;
  gr_items?: GRItem[];
}

export interface GRItem {
  id: string;
  gr_id: string;
  po_item_id: string;
  item_number: number;
  description: string;
  quantity_received: number;
  unit: string;
  price_per_unit: number;
  total_value: number;
  batch: string;
  storage_location: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_invoice_number: string;
  po_id: string;
  vendor_id: string;
  posting_date: string;
  invoice_date: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  currency: string;
  payment_terms: string;
  due_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  purchase_order?: PurchaseOrder;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  po_item_id: string;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  net_amount: number;
  tax_code: string;
  tax_rate: number;
  created_at: string;
}

export type AppPage =
  | 'launchpad'
  | 'pr-list'
  | 'pr-create'
  | 'pr-detail'
  | 'po-list'
  | 'po-create'
  | 'po-detail'
  | 'gr-list'
  | 'gr-create'
  | 'gr-detail'
  | 'invoice-list'
  | 'invoice-create'
  | 'invoice-detail'
  | 'cycle-tracker'
  | 'vendor-list';
