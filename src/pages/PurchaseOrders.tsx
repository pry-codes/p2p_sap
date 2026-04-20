import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  SapTable, StatusBadge, SapButton, FormField, FormRow,
  SapInput, SapSelect, SapTextarea, Section, ObjectHeader,
  Spinner, InfoBox
} from '../components/SapUI';
import { PurchaseOrder, POItem, Vendor, PurchaseRequisition, AppPage } from '../types';

interface Props {
  onNavigate: (page: AppPage, id?: string) => void;
  selectedId?: string;
  prId?: string;
}

function genPONumber() {
  return 'PO-' + String(Date.now()).slice(-7);
}

export function PurchaseOrderList({ onNavigate }: Props) {
  const [pos, setPos] = useState<(PurchaseOrder & { vendor?: Vendor })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('purchase_orders')
        .select('*, vendor:vendors(*)')
        .order('created_at', { ascending: false });
      setPos(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = pos.filter(p =>
    !filter ||
    p.po_number.toLowerCase().includes(filter.toLowerCase()) ||
    (p.vendor?.name ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  const tableData = filtered.map(po => ({
    po_number: <span className="sap-doc-number">{po.po_number}</span>,
    vendor: <span style={{ fontWeight: 500 }}>{po.vendor?.name ?? '—'}</span>,
    vendor_num: <span className="sap-tag">{po.vendor?.vendor_number ?? '—'}</span>,
    plant: po.plant,
    porg: po.purchasing_org,
    status: <StatusBadge status={po.status} />,
    order_date: new Date(po.order_date).toLocaleDateString(),
    delivery: po.delivery_date ?? '—',
    net: <span className="sap-amount">{po.currency} {Number(po.total_net_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    gross: <span className="sap-amount">{po.currency} {Number(po.total_gross_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    actions: (
      <div style={{ display: 'flex', gap: 4 }}>
        {po.status === 'open' && (
          <SapButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onNavigate('gr-create', po.id); }}>
            Post GR
          </SapButton>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">ME23N — Purchase Orders</div>
          <h1>Purchase Orders</h1>
          <div className="sap-page-header-desc">Monitor all procurement orders and delivery status</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="emphasized" onClick={() => onNavigate('po-create')}>
            <Plus size={14} /> Create PO
          </SapButton>
        </div>
      </div>

      <div className="sap-toolbar">
        <SapInput
          placeholder="Search by PO Number or Vendor..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: 280 }}
        />
        <div className="sap-toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{filtered.length} orders</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="sap-section">
          <SapTable
            columns={[
              { key: 'po_number', label: 'PO Number', width: '120px' },
              { key: 'vendor', label: 'Vendor' },
              { key: 'vendor_num', label: 'Vendor No.' },
              { key: 'plant', label: 'Plant' },
              { key: 'porg', label: 'Purch. Org' },
              { key: 'status', label: 'Status' },
              { key: 'order_date', label: 'Order Date' },
              { key: 'delivery', label: 'Delivery' },
              { key: 'net', label: 'Net Value', align: 'right' },
              { key: 'gross', label: 'Gross Value', align: 'right' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={tableData}
            onRowClick={(i) => onNavigate('po-detail', filtered[i].id)}
            emptyText="No purchase orders found."
          />
        </div>
      )}
    </div>
  );
}

interface POItemForm {
  item_number: number;
  material_number: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  tax_code: string;
  tax_rate: number;
  delivery_date: string;
}

export function PurchaseOrderCreate({ onNavigate, prId }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [form, setForm] = useState({
    vendor_id: '',
    plant: '1000',
    purchasing_org: 'PO01',
    purchasing_group: 'P01',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    payment_terms: 'Net 30',
    currency: 'USD',
    notes: '',
  });
  const [items, setItems] = useState<POItemForm[]>([
    { item_number: 10, material_number: '', description: '', quantity: 1, unit: 'EA', price_per_unit: 0, tax_code: 'V1', tax_rate: 10, delivery_date: '' }
  ]);

  useEffect(() => {
    supabase.from('vendors').select('*').eq('status', 'active').then(({ data }) => setVendors(data ?? []));
    if (prId) {
      supabase.from('purchase_requisitions').select('*, pr_items(*)').eq('id', prId).maybeSingle().then(({ data }) => {
        if (data) {
          setPr(data);
          const prItems = (data.pr_items ?? []) as { item_number: number; material_number: string; description: string; quantity: number; unit: string; price_per_unit: number; delivery_date: string | null }[];
          setItems(prItems.map(it => ({
            item_number: it.item_number,
            material_number: it.material_number,
            description: it.description,
            quantity: Number(it.quantity),
            unit: it.unit,
            price_per_unit: Number(it.price_per_unit),
            tax_code: 'V1',
            tax_rate: 10,
            delivery_date: it.delivery_date ?? '',
          })));
          setForm(p => ({ ...p, currency: data.currency, notes: data.notes }));
        }
      });
    }
  }, [prId]);

  function addItem() {
    setItems(prev => [...prev, {
      item_number: (prev.length + 1) * 10,
      material_number: '', description: '',
      quantity: 1, unit: 'EA', price_per_unit: 0,
      tax_code: 'V1', tax_rate: 10, delivery_date: ''
    }]);
  }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof POItemForm, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const totalNet = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price_per_unit), 0);
  const totalTax = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price_per_unit) * (Number(it.tax_rate) / 100), 0);
  const totalGross = totalNet + totalTax;

  async function handleSave() {
    if (!form.vendor_id) { setError('Please select a vendor'); return; }
    if (items.some(it => !it.description.trim())) { setError('All items must have a description'); return; }
    setSaving(true); setError('');
    try {
      const po_number = genPONumber();
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          ...form, po_number, pr_id: prId ?? null,
          status: 'open',
          total_net_value: totalNet, total_tax: totalTax, total_gross_value: totalGross,
        })
        .select().single();
      if (poErr) throw poErr;
      await supabase.from('po_items').insert(
        items.map(it => ({ ...it, po_id: po.id, quantity: Number(it.quantity), price_per_unit: Number(it.price_per_unit), tax_rate: Number(it.tax_rate) }))
      );
      if (prId) {
        await supabase.from('purchase_requisitions').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', prId);
      }
      setSuccess(`PO ${po_number} created successfully.`);
      setTimeout(() => onNavigate('po-list'), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">ME21N — Create Purchase Order</div>
          <h1>Create Purchase Order {pr ? `— from ${pr.pr_number}` : ''}</h1>
          <div className="sap-page-header-desc">Standard PO | Purchasing Org PO01</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="ghost" onClick={() => onNavigate('po-list')}>Cancel</SapButton>
          <SapButton variant="emphasized" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create PO'}
          </SapButton>
        </div>
      </div>

      {success && <InfoBox type="success">{success}</InfoBox>}
      {error && <InfoBox type="error">{error}</InfoBox>}
      {pr && <InfoBox type="info" title="Reference PR">Creating PO from Purchase Requisition {pr.pr_number} — {pr.title}</InfoBox>}

      <Section title="Header Data">
        <FormRow cols={3}>
          <FormField label="Vendor" required>
            <SapSelect value={form.vendor_id} onChange={e => {
              const v = vendors.find(v => v.id === e.target.value);
              setForm(p => ({ ...p, vendor_id: e.target.value, payment_terms: v?.payment_terms ?? p.payment_terms, currency: v?.currency ?? p.currency }));
            }}>
              <option value="">Select Vendor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_number} — {v.name}</option>)}
            </SapSelect>
          </FormField>
          <FormField label="Purchasing Organization">
            <SapSelect value={form.purchasing_org} onChange={e => setForm(p => ({ ...p, purchasing_org: e.target.value }))}>
              <option value="PO01">PO01 — Central Purchasing</option>
              <option value="PO02">PO02 — Local Purchasing</option>
            </SapSelect>
          </FormField>
          <FormField label="Purchasing Group">
            <SapSelect value={form.purchasing_group} onChange={e => setForm(p => ({ ...p, purchasing_group: e.target.value }))}>
              <option value="P01">P01 — Materials</option>
              <option value="P02">P02 — Services</option>
              <option value="P03">P03 — IT</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={4}>
          <FormField label="Plant">
            <SapSelect value={form.plant} onChange={e => setForm(p => ({ ...p, plant: e.target.value }))}>
              <option value="1000">1000 — Main Plant</option>
              <option value="2000">2000 — Distribution</option>
            </SapSelect>
          </FormField>
          <FormField label="Order Date">
            <SapInput type="date" value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} />
          </FormField>
          <FormField label="Requested Delivery">
            <SapInput type="date" value={form.delivery_date} onChange={e => setForm(p => ({ ...p, delivery_date: e.target.value }))} />
          </FormField>
          <FormField label="Payment Terms">
            <SapSelect value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}>
              <option>Net 30</option><option>Net 45</option><option>Net 60</option>
              <option>2/10 Net 30</option><option>Immediate</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={2}>
          <FormField label="Currency">
            <SapSelect value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={1}>
          <FormField label="Header Text / Notes">
            <SapTextarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </FormField>
        </FormRow>
      </Section>

      <Section title={`Item Overview (${items.length})`} actions={<SapButton variant="secondary" size="sm" onClick={addItem}><Plus size={12} /> Add Line</SapButton>}>
        <div className="sap-table-wrapper">
          <table className="sap-table">
            <thead>
              <tr>
                <th className="sap-th" style={{ width: 50 }}>Item</th>
                <th className="sap-th" style={{ width: 120 }}>Material</th>
                <th className="sap-th">Description *</th>
                <th className="sap-th" style={{ width: 80 }}>Qty</th>
                <th className="sap-th" style={{ width: 70 }}>UoM</th>
                <th className="sap-th" style={{ width: 120 }}>Net Price</th>
                <th className="sap-th" style={{ width: 70 }}>Tax</th>
                <th className="sap-th" style={{ width: 80 }}>Tax %</th>
                <th className="sap-th" style={{ width: 120 }}>Del. Date</th>
                <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Net Value</th>
                <th className="sap-th" style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="sap-tr">
                  <td className="sap-td" style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{item.item_number}</td>
                  <td className="sap-td"><SapInput value={item.material_number} onChange={e => updateItem(i, 'material_number', e.target.value)} /></td>
                  <td className="sap-td"><SapInput value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                  <td className="sap-td"><SapInput type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.001" /></td>
                  <td className="sap-td">
                    <SapSelect value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                      <option>EA</option><option>PC</option><option>KG</option><option>L</option><option>M</option><option>BOX</option>
                    </SapSelect>
                  </td>
                  <td className="sap-td"><SapInput type="number" value={item.price_per_unit} onChange={e => updateItem(i, 'price_per_unit', e.target.value)} min="0" step="0.01" /></td>
                  <td className="sap-td">
                    <SapSelect value={item.tax_code} onChange={e => updateItem(i, 'tax_code', e.target.value)}>
                      <option value="V1">V1</option><option value="V2">V2</option><option value="E0">E0</option>
                    </SapSelect>
                  </td>
                  <td className="sap-td"><SapInput type="number" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} min="0" max="100" /></td>
                  <td className="sap-td"><SapInput type="date" value={item.delivery_date} onChange={e => updateItem(i, 'delivery_date', e.target.value)} /></td>
                  <td className="sap-td" style={{ textAlign: 'right' }}>
                    <span className="sap-amount">{(Number(item.quantity) * Number(item.price_per_unit)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="sap-td">
                    {items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sap-error)', padding: 4 }}><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ background: '#fafafa', border: '1px solid var(--sap-border)', borderRadius: 4, padding: '10px 16px', minWidth: 280 }}>
            {[
              ['Net Value', totalNet],
              ['Tax Amount', totalTax],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{label}:</span>
                <span className="sap-amount">{form.currency} {(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--sap-border)', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Gross Value:</span>
              <span className="sap-amount-large">{form.currency} {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

export function PurchaseOrderDetail({ onNavigate, selectedId }: Props) {
  const id = selectedId;
  const [po, setPo] = useState<PurchaseOrder & { vendor?: Vendor } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('purchase_orders').select('*, vendor:vendors(*), po_items(*)').eq('id', id).maybeSingle().then(({ data }) => {
      setPo(data); setLoading(false);
    });
  }, [id]);

  if (loading) return <Spinner />;
  if (!po) return <InfoBox type="error">PO not found.</InfoBox>;

  const items: POItem[] = (po as PurchaseOrder & { po_items?: POItem[] }).po_items ?? [];

  return (
    <div>
      <ObjectHeader
        number={po.po_number}
        title={`Purchase Order — ${po.vendor?.name ?? ''}`}
        status={po.status}
        attributes={[
          { label: 'Vendor', value: `${po.vendor?.vendor_number} — ${po.vendor?.name}` },
          { label: 'Purch. Org', value: po.purchasing_org },
          { label: 'Plant', value: po.plant },
          { label: 'Order Date', value: new Date(po.order_date).toLocaleDateString() },
          { label: 'Delivery Date', value: po.delivery_date ?? '—' },
          { label: 'Payment Terms', value: po.payment_terms },
          { label: 'Net Value', value: <span className="sap-amount">{po.currency} {Number(po.total_net_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
          { label: 'Gross Value', value: <span className="sap-amount sap-amount-large">{po.currency} {Number(po.total_gross_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
        ]}
        actions={
          <>
            {po.status === 'open' && (
              <SapButton variant="emphasized" onClick={() => onNavigate('gr-create', po.id)}>Post Goods Receipt</SapButton>
            )}
            <SapButton variant="ghost" onClick={() => onNavigate('po-list')}>Back</SapButton>
          </>
        }
      />
      <Section title={`Item Overview (${items.length})`}>
        <SapTable
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'material', label: 'Material' },
            { key: 'description', label: 'Description' },
            { key: 'qty', label: 'Qty', align: 'right' },
            { key: 'unit', label: 'UoM' },
            { key: 'price', label: 'Net Price', align: 'right' },
            { key: 'tax', label: 'Tax' },
            { key: 'net', label: 'Net Value', align: 'right' },
            { key: 'received', label: 'Received', align: 'right' },
            { key: 'delivery', label: 'Del. Date' },
          ]}
          data={items.map(it => ({
            item: <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{it.item_number}</span>,
            material: it.material_number || '—',
            description: it.description,
            qty: Number(it.quantity).toLocaleString(),
            unit: it.unit,
            price: <span className="sap-amount">{Number(it.price_per_unit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            tax: <span className="sap-tag">{it.tax_code} ({it.tax_rate}%)</span>,
            net: <span className="sap-amount">{Number(it.net_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            received: <span style={{ color: Number(it.received_quantity) > 0 ? 'var(--sap-success)' : 'var(--sap-text-secondary)' }}>{Number(it.received_quantity).toLocaleString()}</span>,
            delivery: it.delivery_date ?? '—',
          }))}
          emptyText="No items"
        />
      </Section>
    </div>
  );
}
