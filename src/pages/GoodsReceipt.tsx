import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  SapTable, StatusBadge, SapButton, FormField, FormRow,
  SapInput, SapSelect, SapTextarea, Section, ObjectHeader,
  Spinner, InfoBox
} from '../components/SapUI';
import { GoodsReceipt, GRItem, PurchaseOrder, Vendor, POItem, AppPage } from '../types';

interface Props {
  onNavigate: (page: AppPage, id?: string) => void;
  selectedId?: string;
  poId?: string;
}

function genGRNumber() {
  return 'GR-' + String(Date.now()).slice(-7);
}

export function GoodsReceiptList({ onNavigate }: Props) {
  const [grs, setGrs] = useState<(GoodsReceipt & { purchase_order?: PurchaseOrder & { vendor?: Vendor } })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('goods_receipts')
      .select('*, purchase_order:purchase_orders(*, vendor:vendors(*))')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setGrs(data ?? []); setLoading(false); });
  }, []);

  const tableData = grs.map(gr => ({
    gr_number: <span className="sap-doc-number">{gr.gr_number}</span>,
    po: <span className="sap-doc-number">{gr.purchase_order?.po_number ?? '—'}</span>,
    vendor: gr.purchase_order?.vendor?.name ?? '—',
    mvt: <span className="sap-tag">{gr.movement_type}</span>,
    posting_date: new Date(gr.posting_date).toLocaleDateString(),
    plant: gr.plant,
    storage: gr.storage_location,
    delivery_note: gr.delivery_note || '—',
    status: <StatusBadge status={gr.status} />,
    value: <span className="sap-amount">{gr.currency} {Number(gr.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
  }));

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">MB51 — Goods Receipt Documents</div>
          <h1>Goods Receipt Documents</h1>
          <div className="sap-page-header-desc">Movement type 101 — Goods receipt for purchase order</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="emphasized" onClick={() => onNavigate('gr-create')}>Post GR</SapButton>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="sap-section">
          <SapTable
            columns={[
              { key: 'gr_number', label: 'GR Document', width: '120px' },
              { key: 'po', label: 'Ref. PO', width: '120px' },
              { key: 'vendor', label: 'Vendor' },
              { key: 'mvt', label: 'Mvt Type', width: '80px' },
              { key: 'posting_date', label: 'Posting Date' },
              { key: 'plant', label: 'Plant' },
              { key: 'storage', label: 'Stor. Loc.' },
              { key: 'delivery_note', label: 'Delivery Note' },
              { key: 'status', label: 'Status' },
              { key: 'value', label: 'Total Value', align: 'right' },
            ]}
            data={tableData}
            onRowClick={(i) => onNavigate('gr-detail', grs[i].id)}
            emptyText="No goods receipts posted. Select a PO and post a GR."
          />
        </div>
      )}
    </div>
  );
}

interface GRItemForm {
  po_item_id: string;
  item_number: number;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  price_per_unit: number;
  storage_location: string;
  batch: string;
}

export function GoodsReceiptCreate({ onNavigate, poId }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openPos, setOpenPos] = useState<(PurchaseOrder & { vendor?: Vendor })[]>([]);
  const [selectedPoId, setSelectedPoId] = useState(poId ?? '');
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [form, setForm] = useState({
    movement_type: '101',
    posting_date: new Date().toISOString().split('T')[0],
    document_date: new Date().toISOString().split('T')[0],
    plant: '1000',
    storage_location: '0001',
    delivery_note: '',
    notes: '',
  });
  const [grItems, setGrItems] = useState<GRItemForm[]>([]);

  useEffect(() => {
    supabase.from('purchase_orders').select('*, vendor:vendors(*)').in('status', ['open', 'partially_delivered']).then(({ data }) => {
      setOpenPos(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedPoId) { setPoItems([]); setGrItems([]); return; }
    supabase.from('po_items').select('*').eq('po_id', selectedPoId).then(({ data }) => {
      const items = data ?? [];
      setPoItems(items);
      setGrItems(items.map(it => ({
        po_item_id: it.id,
        item_number: it.item_number,
        description: it.description,
        quantity_ordered: Number(it.quantity),
        quantity_received: Number(it.quantity) - Number(it.received_quantity),
        unit: it.unit,
        price_per_unit: Number(it.price_per_unit),
        storage_location: '0001',
        batch: '',
      })));
      const po = openPos.find(p => p.id === selectedPoId);
      if (po) setForm(f => ({ ...f, plant: po.plant }));
    });
  }, [selectedPoId]);

  function updateGRItem(i: number, field: keyof GRItemForm, value: string | number) {
    setGrItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const totalValue = grItems.reduce((sum, it) => sum + Number(it.quantity_received) * Number(it.price_per_unit), 0);
  const po = openPos.find(p => p.id === selectedPoId);

  async function handlePost() {
    if (!selectedPoId) { setError('Please select a purchase order'); return; }
    if (grItems.some(it => Number(it.quantity_received) <= 0)) { setError('All received quantities must be greater than 0'); return; }
    setSaving(true); setError('');
    try {
      const gr_number = genGRNumber();
      const { data: gr, error: grErr } = await supabase
        .from('goods_receipts')
        .insert({ ...form, gr_number, po_id: selectedPoId, status: 'posted', total_value: totalValue, currency: po?.currency ?? 'USD' })
        .select().single();
      if (grErr) throw grErr;

      await supabase.from('gr_items').insert(
        grItems.map(it => ({
          gr_id: gr.id,
          po_item_id: it.po_item_id,
          item_number: it.item_number,
          description: it.description,
          quantity_received: Number(it.quantity_received),
          unit: it.unit,
          price_per_unit: Number(it.price_per_unit),
          batch: it.batch,
          storage_location: it.storage_location,
        }))
      );

      for (const it of grItems) {
        const poItem = poItems.find(p => p.id === it.po_item_id);
        if (poItem) {
          const newReceived = Number(poItem.received_quantity) + Number(it.quantity_received);
          await supabase.from('po_items').update({ received_quantity: newReceived }).eq('id', it.po_item_id);
        }
      }

      const allItems = await supabase.from('po_items').select('quantity, received_quantity').eq('po_id', selectedPoId);
      const allDelivered = (allItems.data ?? []).every(it => Number(it.received_quantity) >= Number(it.quantity));
      await supabase.from('purchase_orders').update({
        status: allDelivered ? 'fully_delivered' : 'partially_delivered',
        updated_at: new Date().toISOString()
      }).eq('id', selectedPoId);

      setSuccess(`Goods Receipt ${gr_number} posted successfully. Movement type 101.`);
      setTimeout(() => onNavigate('gr-list'), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">MIGO — Post Goods Receipt</div>
          <h1>Post Goods Receipt</h1>
          <div className="sap-page-header-desc">Goods Receipt for Purchase Order — Movement Type 101</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="ghost" onClick={() => onNavigate('gr-list')}>Cancel</SapButton>
          <SapButton variant="emphasized" onClick={handlePost} disabled={saving || !selectedPoId}>
            {saving ? 'Posting...' : 'Post (MIGO)'}
          </SapButton>
        </div>
      </div>

      {success && <InfoBox type="success" title="Document Posted">{success}</InfoBox>}
      {error && <InfoBox type="error">{error}</InfoBox>}

      <Section title="Header — Goods Receipt">
        <FormRow cols={3}>
          <FormField label="Reference Purchase Order" required>
            <SapSelect value={selectedPoId} onChange={e => setSelectedPoId(e.target.value)}>
              <option value="">Select PO...</option>
              {openPos.map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — {po.vendor?.name}
                </option>
              ))}
            </SapSelect>
          </FormField>
          <FormField label="Movement Type" hint="101 = GR for PO">
            <SapSelect value={form.movement_type} onChange={e => setForm(p => ({ ...p, movement_type: e.target.value }))}>
              <option value="101">101 — GR for Purchase Order</option>
              <option value="122">122 — Return to Vendor</option>
            </SapSelect>
          </FormField>
          <FormField label="Delivery Note">
            <SapInput value={form.delivery_note} onChange={e => setForm(p => ({ ...p, delivery_note: e.target.value }))} placeholder="Vendor delivery note number" />
          </FormField>
        </FormRow>
        <FormRow cols={4}>
          <FormField label="Posting Date">
            <SapInput type="date" value={form.posting_date} onChange={e => setForm(p => ({ ...p, posting_date: e.target.value }))} />
          </FormField>
          <FormField label="Document Date">
            <SapInput type="date" value={form.document_date} onChange={e => setForm(p => ({ ...p, document_date: e.target.value }))} />
          </FormField>
          <FormField label="Plant">
            <SapSelect value={form.plant} onChange={e => setForm(p => ({ ...p, plant: e.target.value }))}>
              <option value="1000">1000 — Main Plant</option>
              <option value="2000">2000 — Distribution</option>
            </SapSelect>
          </FormField>
          <FormField label="Storage Location">
            <SapSelect value={form.storage_location} onChange={e => setForm(p => ({ ...p, storage_location: e.target.value }))}>
              <option value="0001">0001 — Main Warehouse</option>
              <option value="0002">0002 — Production</option>
              <option value="0003">0003 — Quality Control</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={1}>
          <FormField label="Header Text">
            <SapTextarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </FormField>
        </FormRow>
      </Section>

      {grItems.length > 0 && (
        <Section title={`Item Detail — ${grItems.length} positions`}>
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
                  <th className="sap-th" style={{ width: 100, textAlign: 'right' }}>PO Qty</th>
                  <th className="sap-th" style={{ width: 120, textAlign: 'right' }}>Receive Qty *</th>
                  <th className="sap-th" style={{ width: 70 }}>UoM</th>
                  <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Unit Price</th>
                  <th className="sap-th" style={{ width: 100 }}>Batch</th>
                  <th className="sap-th" style={{ width: 120 }}>Stor. Loc.</th>
                  <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {grItems.map((item, i) => (
                  <tr key={i} className="sap-tr">
                    <td className="sap-td" style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{item.item_number}</td>
                    <td className="sap-td" style={{ fontWeight: 500 }}>{item.description}</td>
                    <td className="sap-td" style={{ textAlign: 'right', color: 'var(--sap-text-secondary)' }}>{item.quantity_ordered} {item.unit}</td>
                    <td className="sap-td">
                      <SapInput
                        type="number"
                        value={item.quantity_received}
                        onChange={e => updateGRItem(i, 'quantity_received', e.target.value)}
                        min="0"
                        step="0.001"
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td className="sap-td">{item.unit}</td>
                    <td className="sap-td" style={{ textAlign: 'right' }}>
                      <span className="sap-amount">{Number(item.price_per_unit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="sap-td">
                      <SapInput value={item.batch} onChange={e => updateGRItem(i, 'batch', e.target.value)} placeholder="Batch no." />
                    </td>
                    <td className="sap-td">
                      <SapSelect value={item.storage_location} onChange={e => updateGRItem(i, 'storage_location', e.target.value)}>
                        <option value="0001">0001</option>
                        <option value="0002">0002</option>
                        <option value="0003">0003</option>
                      </SapSelect>
                    </td>
                    <td className="sap-td" style={{ textAlign: 'right' }}>
                      <span className="sap-amount">{(Number(item.quantity_received) * Number(item.price_per_unit)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={8} style={{ padding: '8px 12px', textAlign: 'right', background: '#fafafa', fontWeight: 600, fontSize: 13 }}>Total GR Value:</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', background: '#fafafa' }}>
                    <span className="sap-amount-large">{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {!selectedPoId && (
        <div className="sap-section">
          <div className="sap-empty-state">
            <div className="sap-empty-title">Select a Purchase Order</div>
            <div className="sap-empty-desc">Choose a PO reference above to load the line items for goods receipt posting.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoodsReceiptDetail({ onNavigate, selectedId }: Props) {
  const id = selectedId;
  const [gr, setGr] = useState<GoodsReceipt & { purchase_order?: PurchaseOrder & { vendor?: Vendor } } | null>(null);
  const [grItems, setGrItems] = useState<GRItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('goods_receipts').select('*, purchase_order:purchase_orders(*, vendor:vendors(*))').eq('id', id).maybeSingle(),
      supabase.from('gr_items').select('*').eq('gr_id', id),
    ]).then(([grRes, itemsRes]) => {
      setGr(grRes.data);
      setGrItems(itemsRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Spinner />;
  if (!gr) return <InfoBox type="error">GR document not found.</InfoBox>;

  return (
    <div>
      <ObjectHeader
        number={gr.gr_number}
        title={`Goods Receipt — ${gr.purchase_order?.vendor?.name ?? ''}`}
        status={gr.status}
        attributes={[
          { label: 'Reference PO', value: <span className="sap-doc-number">{gr.purchase_order?.po_number ?? '—'}</span> },
          { label: 'Movement Type', value: <span className="sap-tag">{gr.movement_type}</span> },
          { label: 'Posting Date', value: new Date(gr.posting_date).toLocaleDateString() },
          { label: 'Plant', value: gr.plant },
          { label: 'Storage Location', value: gr.storage_location },
          { label: 'Delivery Note', value: gr.delivery_note || '—' },
          { label: 'Total Value', value: <span className="sap-amount-large">{gr.currency} {Number(gr.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
        ]}
        actions={<SapButton variant="ghost" onClick={() => onNavigate('gr-list')}>Back</SapButton>}
      />

      <Section title={`Line Items (${grItems.length})`}>
        <SapTable
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'description', label: 'Description' },
            { key: 'qty', label: 'Qty Received', align: 'right' },
            { key: 'unit', label: 'UoM' },
            { key: 'price', label: 'Unit Price', align: 'right' },
            { key: 'value', label: 'Total Value', align: 'right' },
            { key: 'batch', label: 'Batch' },
            { key: 'storage', label: 'Stor. Loc.' },
          ]}
          data={grItems.map(it => ({
            item: <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{it.item_number}</span>,
            description: it.description,
            qty: Number(it.quantity_received).toLocaleString(),
            unit: it.unit,
            price: <span className="sap-amount">{Number(it.price_per_unit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            value: <span className="sap-amount">{Number(it.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            batch: it.batch || '—',
            storage: it.storage_location,
          }))}
          emptyText="No items"
        />
      </Section>
    </div>
  );
}
