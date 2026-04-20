
/*
  # P2P (Procure-to-Pay) Full Purchase Cycle - SAP MM

  ## Overview
  Complete schema for SAP MM Procure-to-Pay cycle covering:
  1. Vendor Master Data
  2. Purchase Requisitions (ME51N)
  3. Purchase Orders (ME21N)
  4. Goods Receipts (MIGO)
  5. Invoice Verification (MIRO)

  ## Tables
  - `vendors` — supplier master records
  - `purchase_requisitions` — PR headers
  - `pr_items` — PR line items
  - `purchase_orders` — PO headers (linked to PRs and vendors)
  - `po_items` — PO line items
  - `goods_receipts` — GR headers (linked to POs)
  - `gr_items` — GR line items
  - `invoices` — Invoice headers (MIRO, linked to POs)
  - `invoice_items` — Invoice line items

  ## Security
  - RLS enabled on all tables
  - Public read/write for demo purposes (no auth required for this app)
*/

-- VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_number text UNIQUE NOT NULL,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  city text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  payment_terms text NOT NULL DEFAULT 'Net 30',
  currency text NOT NULL DEFAULT 'USD',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Public insert vendors" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vendors" ON vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vendors" ON vendors FOR DELETE USING (true);

-- PURCHASE REQUISITIONS
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number text UNIQUE NOT NULL,
  title text NOT NULL,
  requester text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  plant text NOT NULL DEFAULT '1000',
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL DEFAULT 'normal',
  required_date date,
  total_value numeric(15,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read purchase_requisitions" ON purchase_requisitions FOR SELECT USING (true);
CREATE POLICY "Public insert purchase_requisitions" ON purchase_requisitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update purchase_requisitions" ON purchase_requisitions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete purchase_requisitions" ON purchase_requisitions FOR DELETE USING (true);

-- PR ITEMS
CREATE TABLE IF NOT EXISTS pr_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id uuid NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  item_number integer NOT NULL DEFAULT 10,
  material_number text NOT NULL DEFAULT '',
  description text NOT NULL,
  quantity numeric(13,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'EA',
  price_per_unit numeric(15,2) NOT NULL DEFAULT 0,
  total_price numeric(15,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  material_group text NOT NULL DEFAULT '',
  delivery_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pr_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pr_items" ON pr_items FOR SELECT USING (true);
CREATE POLICY "Public insert pr_items" ON pr_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update pr_items" ON pr_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete pr_items" ON pr_items FOR DELETE USING (true);

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  pr_id uuid REFERENCES purchase_requisitions(id),
  plant text NOT NULL DEFAULT '1000',
  purchasing_org text NOT NULL DEFAULT 'PO01',
  purchasing_group text NOT NULL DEFAULT 'P01',
  status text NOT NULL DEFAULT 'open',
  order_date date DEFAULT CURRENT_DATE,
  delivery_date date,
  payment_terms text NOT NULL DEFAULT 'Net 30',
  currency text NOT NULL DEFAULT 'USD',
  total_net_value numeric(15,2) DEFAULT 0,
  total_tax numeric(15,2) DEFAULT 0,
  total_gross_value numeric(15,2) DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read purchase_orders" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Public insert purchase_orders" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update purchase_orders" ON purchase_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete purchase_orders" ON purchase_orders FOR DELETE USING (true);

-- PO ITEMS
CREATE TABLE IF NOT EXISTS po_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  pr_item_id uuid REFERENCES pr_items(id),
  item_number integer NOT NULL DEFAULT 10,
  material_number text NOT NULL DEFAULT '',
  description text NOT NULL,
  quantity numeric(13,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'EA',
  price_per_unit numeric(15,2) NOT NULL DEFAULT 0,
  net_price numeric(15,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  tax_code text NOT NULL DEFAULT 'V1',
  tax_rate numeric(5,2) NOT NULL DEFAULT 10,
  delivery_date date,
  received_quantity numeric(13,3) NOT NULL DEFAULT 0,
  invoiced_quantity numeric(13,3) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read po_items" ON po_items FOR SELECT USING (true);
CREATE POLICY "Public insert po_items" ON po_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update po_items" ON po_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete po_items" ON po_items FOR DELETE USING (true);

-- GOODS RECEIPTS
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_number text UNIQUE NOT NULL,
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  movement_type text NOT NULL DEFAULT '101',
  posting_date date DEFAULT CURRENT_DATE,
  document_date date DEFAULT CURRENT_DATE,
  plant text NOT NULL DEFAULT '1000',
  storage_location text NOT NULL DEFAULT '0001',
  status text NOT NULL DEFAULT 'posted',
  delivery_note text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  total_value numeric(15,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read goods_receipts" ON goods_receipts FOR SELECT USING (true);
CREATE POLICY "Public insert goods_receipts" ON goods_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update goods_receipts" ON goods_receipts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete goods_receipts" ON goods_receipts FOR DELETE USING (true);

-- GR ITEMS
CREATE TABLE IF NOT EXISTS gr_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES po_items(id),
  item_number integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  quantity_received numeric(13,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'EA',
  price_per_unit numeric(15,2) NOT NULL DEFAULT 0,
  total_value numeric(15,2) GENERATED ALWAYS AS (quantity_received * price_per_unit) STORED,
  batch text NOT NULL DEFAULT '',
  storage_location text NOT NULL DEFAULT '0001',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gr_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gr_items" ON gr_items FOR SELECT USING (true);
CREATE POLICY "Public insert gr_items" ON gr_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update gr_items" ON gr_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete gr_items" ON gr_items FOR DELETE USING (true);

-- INVOICES (MIRO)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  vendor_invoice_number text NOT NULL DEFAULT '',
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  posting_date date DEFAULT CURRENT_DATE,
  invoice_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'parked',
  payment_status text NOT NULL DEFAULT 'open',
  gross_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  net_amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_terms text NOT NULL DEFAULT 'Net 30',
  due_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Public insert invoices" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invoices" ON invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete invoices" ON invoices FOR DELETE USING (true);

-- INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES po_items(id),
  item_number integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  quantity numeric(13,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'EA',
  price_per_unit numeric(15,2) NOT NULL DEFAULT 0,
  net_amount numeric(15,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  tax_code text NOT NULL DEFAULT 'V1',
  tax_rate numeric(5,2) NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read invoice_items" ON invoice_items FOR SELECT USING (true);
CREATE POLICY "Public insert invoice_items" ON invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invoice_items" ON invoice_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete invoice_items" ON invoice_items FOR DELETE USING (true);

-- SEED VENDORS
INSERT INTO vendors (vendor_number, name, country, city, street, payment_terms, currency, contact_email, contact_phone, status) VALUES
('V-10001', 'Acme Industrial Supplies GmbH', 'DE', 'Frankfurt', 'Industriestraße 45', 'Net 30', 'USD', 'procurement@acme-ind.de', '+49-69-12345678', 'active'),
('V-10002', 'TechParts International Ltd', 'US', 'Chicago', '500 Commerce Blvd', 'Net 45', 'USD', 'orders@techparts.com', '+1-312-555-0198', 'active'),
('V-10003', 'Global Office Solutions S.A.', 'FR', 'Paris', '12 Rue du Commerce', 'Net 30', 'EUR', 'supply@globalofc.fr', '+33-1-4567-8901', 'active'),
('V-10004', 'Precision Engineering Co.', 'JP', 'Tokyo', '3-5-7 Shinjuku', 'Net 60', 'USD', 'export@preceng.jp', '+81-3-1234-5678', 'active'),
('V-10005', 'Nordic Raw Materials AB', 'SE', 'Stockholm', 'Industrivägen 22', 'Net 30', 'USD', 'sales@nordicraw.se', '+46-8-765-4321', 'active')
ON CONFLICT (vendor_number) DO NOTHING;
