import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  SapTable, StatusBadge, SapButton, FormField, FormRow,
  SapInput, SapSelect, SapTextarea, Section, ObjectHeader,
  Spinner, InfoBox
} from '../components/SapUI';
import { Invoice, InvoiceItem, PurchaseOrder, Vendor, POItem, AppPage } from '../types';

interface Props {
  onNavigate: (page: AppPage, id?: string) => void;
  selectedId?: string;
  poId?: string;
}

function genInvoiceNumber() {
  return 'INV-' + String(Date.now()).slice(-7);
}

export function InvoiceList({ onNavigate }: Props) {
  const [invoices, setInvoices] = useState<(Invoice & { vendor?: Vendor; purchase_order?: PurchaseOrder })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInvoices(data ?? []); setLoading(false); });
  }, []);

  async function updateStatus(id: string, status: string) {
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    const { data } = await supabase.from('invoices').select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)').order('created_at', { ascending: false });
    setInvoices(data ?? []);
  }

  async function markPaid(id: string) {
    await supabase.from('invoices').update({ payment_status: 'paid', status: 'paid', updated_at: new Date().toISOString() }).eq('id', id);
    const { data } = await supabase.from('invoices').select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)').order('created_at', { ascending: false });
    setInvoices(data ?? []);
  }

  const tableData = invoices.map(inv => ({
    inv_number: <span className="sap-doc-number">{inv.invoice_number}</span>,
    vendor_inv: inv.vendor_invoice_number || '—',
    vendor: inv.vendor?.name ?? '—',
    po: <span className="sap-doc-number">{(inv.purchase_order as PurchaseOrder & { po_number: string })?.po_number ?? '—'}</span>,
    inv_date: new Date(inv.invoice_date).toLocaleDateString(),
    posting_date: new Date(inv.posting_date).toLocaleDateString(),
    due_date: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—',
    status: <StatusBadge status={inv.status} />,
    payment: <StatusBadge status={inv.payment_status} />,
    net: <span className="sap-amount">{inv.currency} {Number(inv.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    gross: <span className="sap-amount">{inv.currency} {Number(inv.gross_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    actions: (
      <div style={{ display: 'flex', gap: 4 }}>
        {inv.status === 'parked' && (
          <SapButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'posted'); }}>
            Post
          </SapButton>
        )}
        {inv.status === 'posted' && inv.payment_status === 'open' && (
          <SapButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); markPaid(inv.id); }}>
            Mark Paid
          </SapButton>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">MIR4 — Invoice Verification</div>
          <h1>Invoice Verification (MIRO)</h1>
          <div className="sap-page-header-desc">Logistics Invoice Verification — 3-way match: PO / GR / Invoice</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="emphasized" onClick={() => onNavigate('invoice-create')}>Enter Invoice</SapButton>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="sap-section">
          <SapTable
            columns={[
              { key: 'inv_number', label: 'Invoice No.', width: '120px' },
              { key: 'vendor_inv', label: 'Vendor Inv.', width: '110px' },
              { key: 'vendor', label: 'Vendor' },
              { key: 'po', label: 'Ref. PO', width: '110px' },
              { key: 'inv_date', label: 'Inv. Date' },
              { key: 'posting_date', label: 'Post. Date' },
              { key: 'due_date', label: 'Due Date' },
              { key: 'status', label: 'Status' },
              { key: 'payment', label: 'Payment' },
              { key: 'net', label: 'Net Amount', align: 'right' },
              { key: 'gross', label: 'Gross', align: 'right' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={tableData}
            onRowClick={(i) => onNavigate('invoice-detail', invoices[i].id)}
            emptyText="No invoices entered. Click 'Enter Invoice' to start."
          />
        </div>
      )}
    </div>
  );
}

interface InvItemForm {
  po_item_id: string;
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  tax_code: string;
  tax_rate: number;
}

export function InvoiceCreate({ onNavigate, poId }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deliveredPos, setDeliveredPos] = useState<(PurchaseOrder & { vendor?: Vendor })[]>([]);
  const [selectedPoId, setSelectedPoId] = useState(poId ?? '');
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [invItems, setInvItems] = useState<InvItemForm[]>([]);
  const [form, setForm] = useState({
    vendor_invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    posting_date: new Date().toISOString().split('T')[0],
    payment_terms: 'Net 30',
    currency: 'USD',
    notes: '',
    post_immediately: false,
  });

  useEffect(() => {
    supabase.from('purchase_orders').select('*, vendor:vendors(*)').in('status', ['fully_delivered', 'partially_delivered', 'open']).then(({ data }) => {
      setDeliveredPos(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedPoId) { setPoItems([]); setInvItems([]); return; }
    supabase.from('po_items').select('*').eq('po_id', selectedPoId).then(({ data }) => {
      const items = data ?? [];
      setPoItems(items);
      setInvItems(items.map(it => ({
        po_item_id: it.id,
        item_number: it.item_number,
        description: it.description,
        quantity: Number(it.quantity),
        unit: it.unit,
        price_per_unit: Number(it.price_per_unit),
        tax_code: it.tax_code,
        tax_rate: Number(it.tax_rate),
      })));
      const po = deliveredPos.find(p => p.id === selectedPoId);
      if (po) {
        setForm(f => ({
          ...f,
          payment_terms: po.payment_terms,
          currency: po.currency,
        }));
      }
    });
  }, [selectedPoId]);

  function updateItem(i: number, field: keyof InvItemForm, value: string | number) {
    setInvItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const netAmount = invItems.reduce((s, it) => s + Number(it.quantity) * Number(it.price_per_unit), 0);
  const taxAmount = invItems.reduce((s, it) => s + Number(it.quantity) * Number(it.price_per_unit) * (Number(it.tax_rate) / 100), 0);
  const grossAmount = netAmount + taxAmount;

  const dueDate = (() => {
    const d = new Date(form.posting_date);
    const days = form.payment_terms.includes('30') ? 30 : form.payment_terms.includes('45') ? 45 : form.payment_terms.includes('60') ? 60 : 30;
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  })();

  const po = deliveredPos.find(p => p.id === selectedPoId);

  async function handleSave() {
    if (!selectedPoId) { setError('Please select a reference PO'); return; }
    if (!form.vendor_invoice_number.trim()) { setError('Vendor invoice number is required'); return; }
    setSaving(true); setError('');
    try {
      const invoice_number = genInvoiceNumber();
      const status = form.post_immediately ? 'posted' : 'parked';
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number,
          vendor_invoice_number: form.vendor_invoice_number,
          po_id: selectedPoId,
          vendor_id: po!.vendor_id,
          posting_date: form.posting_date,
          invoice_date: form.invoice_date,
          status,
          payment_status: 'open',
          net_amount: netAmount,
          tax_amount: taxAmount,
          gross_amount: grossAmount,
          currency: form.currency,
          payment_terms: form.payment_terms,
          due_date: dueDate,
          notes: form.notes,
        })
        .select().single();
      if (invErr) throw invErr;

      await supabase.from('invoice_items').insert(
        invItems.map(it => ({
          invoice_id: inv.id,
          po_item_id: it.po_item_id,
          item_number: it.item_number,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          price_per_unit: Number(it.price_per_unit),
          tax_code: it.tax_code,
          tax_rate: Number(it.tax_rate),
        }))
      );

      if (status === 'posted') {
        await supabase.from('purchase_orders').update({ status: 'invoiced', updated_at: new Date().toISOString() }).eq('id', selectedPoId);
      }

      setSuccess(`Invoice ${invoice_number} ${status === 'posted' ? 'posted' : 'parked'} successfully.`);
      setTimeout(() => onNavigate('invoice-list'), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">MIRO — Enter Incoming Invoice</div>
          <h1>Enter Incoming Invoice</h1>
          <div className="sap-page-header-desc">Logistics Invoice Verification — 3-way match verification</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="ghost" onClick={() => onNavigate('invoice-list')}>Cancel</SapButton>
          <SapButton variant="secondary" onClick={() => { (form as typeof form & { post_immediately: boolean }).post_immediately = false; handleSave(); }} disabled={saving}>
            Park
          </SapButton>
          <SapButton variant="emphasized" onClick={() => { setForm(p => ({ ...p, post_immediately: true })); setTimeout(handleSave, 50); }} disabled={saving}>
            {saving ? 'Saving...' : 'Post (MIRO)'}
          </SapButton>
        </div>
      </div>

      {success && <InfoBox type="success">{success}</InfoBox>}
      {error && <InfoBox type="error">{error}</InfoBox>}

      <Section title="Basic Data">
        <FormRow cols={3}>
          <FormField label="Reference Purchase Order" required>
            <SapSelect value={selectedPoId} onChange={e => setSelectedPoId(e.target.value)}>
              <option value="">Select PO...</option>
              {deliveredPos.map(po => (
                <option key={po.id} value={po.id}>{po.po_number} — {po.vendor?.name}</option>
              ))}
            </SapSelect>
          </FormField>
          <FormField label="Vendor Invoice Number" required>
            <SapInput value={form.vendor_invoice_number} onChange={e => setForm(p => ({ ...p, vendor_invoice_number: e.target.value }))} placeholder="e.g., VN-2024-00123" />
          </FormField>
          <FormField label="Invoice Date">
            <SapInput type="date" value={form.invoice_date} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
          </FormField>
        </FormRow>
        <FormRow cols={4}>
          <FormField label="Posting Date">
            <SapInput type="date" value={form.posting_date} onChange={e => setForm(p => ({ ...p, posting_date: e.target.value }))} />
          </FormField>
          <FormField label="Payment Terms">
            <SapSelect value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}>
              <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>2/10 Net 30</option>
            </SapSelect>
          </FormField>
          <FormField label="Currency">
            <SapSelect value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </SapSelect>
          </FormField>
          <FormField label="Due Date" hint="Calculated from posting date">
            <SapInput type="date" value={dueDate} disabled />
          </FormField>
        </FormRow>
        <FormRow cols={1}>
          <FormField label="Header Text">
            <SapTextarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </FormField>
        </FormRow>
      </Section>

      {invItems.length > 0 ? (
        <Section title="PO Reference Items">
          {po && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--sap-blue-light)', borderRadius: 4, fontSize: 12 }}>
              PO {po.po_number} | Vendor: {po.vendor?.name} | Status: <StatusBadge status={po.status} />
            </div>
          )}
          <div className="sap-table-wrapper">
            <table className="sap-table">
              <thead>
                <tr>
                  <th className="sap-th" style={{ width: 50 }}>Item</th>
                  <th className="sap-th">Description</th>
                  <th className="sap-th" style={{ width: 90, textAlign: 'right' }}>Qty</th>
                  <th className="sap-th" style={{ width: 70 }}>UoM</th>
                  <th className="sap-th" style={{ width: 130 }}>Net Price</th>
                  <th className="sap-th" style={{ width: 70 }}>Tax</th>
                  <th className="sap-th" style={{ width: 70, textAlign: 'right' }}>Tax %</th>
                  <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Net Amount</th>
                  <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Tax Amount</th>
                </tr>
              </thead>
              <tbody>
                {invItems.map((item, i) => {
                  const net = Number(item.quantity) * Number(item.price_per_unit);
                  const tax = net * (Number(item.tax_rate) / 100);
                  return (
                    <tr key={i} className="sap-tr">
                      <td className="sap-td" style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{item.item_number}</td>
                      <td className="sap-td" style={{ fontWeight: 500 }}>{item.description}</td>
                      <td className="sap-td">
                        <SapInput type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0" step="0.001" style={{ textAlign: 'right' }} />
                      </td>
                      <td className="sap-td">{item.unit}</td>
                      <td className="sap-td">
                        <SapInput type="number" value={item.price_per_unit} onChange={e => updateItem(i, 'price_per_unit', e.target.value)} min="0" step="0.01" />
                      </td>
                      <td className="sap-td">
                        <SapSelect value={item.tax_code} onChange={e => updateItem(i, 'tax_code', e.target.value)}>
                          <option value="V1">V1</option><option value="V2">V2</option><option value="E0">E0</option>
                        </SapSelect>
                      </td>
                      <td className="sap-td" style={{ textAlign: 'right' }}>{item.tax_rate}%</td>
                      <td className="sap-td" style={{ textAlign: 'right' }}><span className="sap-amount">{net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
                      <td className="sap-td" style={{ textAlign: 'right' }}><span className="sap-amount">{tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <div style={{ background: '#fafafa', border: '1px solid var(--sap-border)', borderRadius: 4, padding: '12px 16px', minWidth: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>Net Amount ({form.currency}):</span>
                <span className="sap-amount">{netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>Tax Amount:</span>
                <span className="sap-amount">{taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--sap-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 32 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Gross Amount:</span>
                <span className="sap-amount-large">{form.currency} {grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--sap-text-secondary)' }}>
                Due Date: {new Date(dueDate).toLocaleDateString()} ({form.payment_terms})
              </div>
            </div>
          </div>
        </Section>
      ) : (
        <div className="sap-section">
          <div className="sap-empty-state">
            <div className="sap-empty-title">Select a Reference PO</div>
            <div className="sap-empty-desc">Choose a Purchase Order above to load items for invoice verification.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InvoiceDetail({ onNavigate, selectedId }: Props) {
  const id = selectedId;
  const [inv, setInv] = useState<Invoice & { vendor?: Vendor; purchase_order?: PurchaseOrder } | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('invoices').select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)').eq('id', id).maybeSingle(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id),
    ]).then(([invRes, itemsRes]) => {
      setInv(invRes.data);
      setItems(itemsRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  async function post() {
    await supabase.from('invoices').update({ status: 'posted', updated_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('purchase_orders').update({ status: 'invoiced', updated_at: new Date().toISOString() }).eq('id', inv?.po_id);
    const { data } = await supabase.from('invoices').select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)').eq('id', id).maybeSingle();
    setInv(data);
  }

  async function markPaid() {
    await supabase.from('invoices').update({ status: 'paid', payment_status: 'paid', updated_at: new Date().toISOString() }).eq('id', id);
    const { data } = await supabase.from('invoices').select('*, vendor:vendors(*), purchase_order:purchase_orders(po_number)').eq('id', id).maybeSingle();
    setInv(data);
  }

  if (loading) return <Spinner />;
  if (!inv) return <InfoBox type="error">Invoice not found.</InfoBox>;

  return (
    <div>
      <ObjectHeader
        number={inv.invoice_number}
        title={`Invoice — ${inv.vendor?.name ?? ''}`}
        status={inv.status}
        attributes={[
          { label: 'Vendor Invoice', value: inv.vendor_invoice_number || '—' },
          { label: 'Reference PO', value: <span className="sap-doc-number">{(inv.purchase_order as PurchaseOrder & { po_number: string })?.po_number ?? '—'}</span> },
          { label: 'Invoice Date', value: new Date(inv.invoice_date).toLocaleDateString() },
          { label: 'Posting Date', value: new Date(inv.posting_date).toLocaleDateString() },
          { label: 'Due Date', value: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—' },
          { label: 'Payment Terms', value: inv.payment_terms },
          { label: 'Payment Status', value: <StatusBadge status={inv.payment_status} /> },
          { label: 'Net Amount', value: <span className="sap-amount">{inv.currency} {Number(inv.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
          { label: 'Tax', value: <span className="sap-amount">{Number(inv.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
          { label: 'Gross Amount', value: <span className="sap-amount-large">{inv.currency} {Number(inv.gross_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
        ]}
        actions={
          <>
            {inv.status === 'parked' && <SapButton variant="emphasized" onClick={post}>Post Invoice</SapButton>}
            {inv.status === 'posted' && inv.payment_status === 'open' && <SapButton variant="secondary" onClick={markPaid}>Mark as Paid</SapButton>}
            <SapButton variant="ghost" onClick={() => onNavigate('invoice-list')}>Back</SapButton>
          </>
        }
      />

      <Section title={`Line Items (${items.length})`}>
        <SapTable
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'description', label: 'Description' },
            { key: 'qty', label: 'Qty', align: 'right' },
            { key: 'unit', label: 'UoM' },
            { key: 'price', label: 'Net Price', align: 'right' },
            { key: 'tax', label: 'Tax Code' },
            { key: 'tax_rate', label: 'Tax %', align: 'right' },
            { key: 'net', label: 'Net Amount', align: 'right' },
          ]}
          data={items.map(it => ({
            item: <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{it.item_number}</span>,
            description: it.description,
            qty: Number(it.quantity).toLocaleString(),
            unit: it.unit,
            price: <span className="sap-amount">{Number(it.price_per_unit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            tax: <span className="sap-tag">{it.tax_code}</span>,
            tax_rate: `${it.tax_rate}%`,
            net: <span className="sap-amount">{Number(it.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
          }))}
          emptyText="No items"
        />
      </Section>
    </div>
  );
}
