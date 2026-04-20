import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  SapTable, StatusBadge, SapButton, SapModal,
  FormField, FormRow, SapInput, SapSelect, SapTextarea,
  Section, ObjectHeader, Spinner, InfoBox
} from '../components/SapUI';
import { PurchaseRequisition, PRItem, AppPage } from '../types';

interface PRListProps {
  onNavigate: (page: AppPage, id?: string) => void;
  selectedId?: string;
}

function genPRNumber() {
  return 'PR-' + String(Date.now()).slice(-7);
}

export function PurchaseRequisitionList({ onNavigate }: PRListProps) {
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchPRs(); }, []);

  async function fetchPRs() {
    setLoading(true);
    const { data } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .order('created_at', { ascending: false });
    setPrs(data ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('purchase_requisitions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchPRs();
  }

  const filtered = prs.filter(p =>
    !filter ||
    p.pr_number.toLowerCase().includes(filter.toLowerCase()) ||
    p.title.toLowerCase().includes(filter.toLowerCase()) ||
    p.requester.toLowerCase().includes(filter.toLowerCase())
  );

  const tableData = filtered.map(pr => ({
    pr_number: <span className="sap-doc-number">{pr.pr_number}</span>,
    title: <span style={{ fontWeight: 500 }}>{pr.title}</span>,
    requester: pr.requester,
    department: pr.department,
    plant: <span className="sap-tag">{pr.plant}</span>,
    priority: <span className={`sap-status-badge ${pr.priority === 'urgent' ? 'sap-status-error' : pr.priority === 'high' ? 'sap-status-warning' : 'sap-status-neutral'}`}>{pr.priority}</span>,
    status: <StatusBadge status={pr.status} />,
    total: <span className="sap-amount">{pr.currency} {Number(pr.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    date: new Date(pr.created_at).toLocaleDateString(),
    actions: (
      <div style={{ display: 'flex', gap: 4 }}>
        {pr.status === 'submitted' && (
          <>
            <SapButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(pr.id, 'approved'); }}>
              <CheckCircle size={12} /> Approve
            </SapButton>
            <SapButton variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(pr.id, 'rejected'); }}>
              <XCircle size={12} /> Reject
            </SapButton>
          </>
        )}
        {pr.status === 'draft' && (
          <SapButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(pr.id, 'submitted'); }}>
            Submit
          </SapButton>
        )}
        {pr.status === 'approved' && (
          <SapButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onNavigate('po-create', pr.id); }}>
            Create PO
          </SapButton>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">ME52N — Purchase Requisitions</div>
          <h1>Purchase Requisitions</h1>
          <div className="sap-page-header-desc">Manage and monitor all purchase requisitions in the system</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="emphasized" onClick={() => onNavigate('pr-create')}>
            <Plus size={14} /> Create PR
          </SapButton>
        </div>
      </div>

      <div className="sap-toolbar">
        <SapInput
          placeholder="Search by PR Number, Title, Requester..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: 280 }}
        />
        <div className="sap-toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>
          {filtered.length} of {prs.length} requisitions
        </span>
      </div>

      {loading ? <Spinner /> : (
        <div className="sap-section">
          <SapTable
            columns={[
              { key: 'pr_number', label: 'PR Number', width: '120px' },
              { key: 'title', label: 'Title' },
              { key: 'requester', label: 'Requester' },
              { key: 'department', label: 'Department' },
              { key: 'plant', label: 'Plant', width: '70px' },
              { key: 'priority', label: 'Priority', width: '90px' },
              { key: 'status', label: 'Status', width: '120px' },
              { key: 'total', label: 'Total Value', align: 'right', width: '140px' },
              { key: 'date', label: 'Created', width: '100px' },
              { key: 'actions', label: 'Actions', width: '180px' },
            ]}
            data={tableData}
            onRowClick={(i) => onNavigate('pr-detail', filtered[i].id)}
            emptyText="No purchase requisitions found. Click 'Create PR' to get started."
          />
        </div>
      )}
    </div>
  );
}

interface PRCreateProps {
  onNavigate: (page: AppPage, id?: string) => void;
}

interface PRItemForm {
  item_number: number;
  material_number: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  material_group: string;
  delivery_date: string;
}

export function PurchaseRequisitionCreate({ onNavigate }: PRCreateProps) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    requester: 'John Smith',
    department: 'Purchasing',
    plant: '1000',
    priority: 'normal',
    required_date: '',
    currency: 'USD',
    notes: '',
  });
  const [items, setItems] = useState<PRItemForm[]>([
    { item_number: 10, material_number: '', description: '', quantity: 1, unit: 'EA', price_per_unit: 0, material_group: '', delivery_date: '' }
  ]);

  function addItem() {
    setItems(prev => [...prev, {
      item_number: (prev.length + 1) * 10,
      material_number: '', description: '', quantity: 1,
      unit: 'EA', price_per_unit: 0, material_group: '', delivery_date: ''
    }]);
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof PRItemForm, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const totalValue = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.price_per_unit)), 0);

  async function handleSave(status: 'draft' | 'submitted') {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (items.some(it => !it.description.trim())) { setError('All items must have a description'); return; }
    setSaving(true); setError('');
    try {
      const pr_number = genPRNumber();
      const { data: pr, error: prErr } = await supabase
        .from('purchase_requisitions')
        .insert({ ...form, pr_number, status, total_value: totalValue })
        .select()
        .single();
      if (prErr) throw prErr;
      await supabase.from('pr_items').insert(
        items.map(it => ({ ...it, pr_id: pr.id, quantity: Number(it.quantity), price_per_unit: Number(it.price_per_unit) }))
      );
      setSuccess(`PR ${pr_number} ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully.`);
      setTimeout(() => onNavigate('pr-list'), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">ME51N — Create Purchase Requisition</div>
          <h1>Create Purchase Requisition</h1>
          <div className="sap-page-header-desc">Enter details for the new purchase requisition</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="ghost" onClick={() => onNavigate('pr-list')}>Cancel</SapButton>
          <SapButton variant="secondary" onClick={() => handleSave('draft')} disabled={saving}>Save Draft</SapButton>
          <SapButton variant="emphasized" onClick={() => handleSave('submitted')} disabled={saving}>
            {saving ? 'Saving...' : 'Submit for Approval'}
          </SapButton>
        </div>
      </div>

      {success && <InfoBox type="success" title="Success">{success}</InfoBox>}
      {error && <InfoBox type="error" title="Validation Error">{error}</InfoBox>}

      <Section title="General Information">
        <FormRow cols={2}>
          <FormField label="PR Title" required>
            <SapInput value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Office Supplies Q1 2024" />
          </FormField>
          <FormField label="Priority">
            <SapSelect value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={3}>
          <FormField label="Requester">
            <SapInput value={form.requester} onChange={e => setForm(p => ({ ...p, requester: e.target.value }))} />
          </FormField>
          <FormField label="Department">
            <SapSelect value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
              <option>Purchasing</option>
              <option>IT</option>
              <option>Operations</option>
              <option>Finance</option>
              <option>HR</option>
              <option>Maintenance</option>
            </SapSelect>
          </FormField>
          <FormField label="Plant">
            <SapSelect value={form.plant} onChange={e => setForm(p => ({ ...p, plant: e.target.value }))}>
              <option value="1000">1000 — Main Plant</option>
              <option value="2000">2000 — Distribution</option>
              <option value="3000">3000 — Production</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={3}>
          <FormField label="Required Date">
            <SapInput type="date" value={form.required_date} onChange={e => setForm(p => ({ ...p, required_date: e.target.value }))} />
          </FormField>
          <FormField label="Currency">
            <SapSelect value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </SapSelect>
          </FormField>
        </FormRow>
        <FormRow cols={1}>
          <FormField label="Notes / Justification">
            <SapTextarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add notes or business justification..." />
          </FormField>
        </FormRow>
      </Section>

      <Section
        title={`Line Items (${items.length})`}
        actions={
          <SapButton variant="secondary" size="sm" onClick={addItem}>
            <Plus size={12} /> Add Item
          </SapButton>
        }
      >
        <div className="sap-table-wrapper">
          <table className="sap-table">
            <thead>
              <tr>
                <th className="sap-th" style={{ width: 50 }}>Item</th>
                <th className="sap-th" style={{ width: 120 }}>Material No.</th>
                <th className="sap-th">Description *</th>
                <th className="sap-th" style={{ width: 90 }}>Qty *</th>
                <th className="sap-th" style={{ width: 70 }}>Unit</th>
                <th className="sap-th" style={{ width: 120 }}>Price/Unit</th>
                <th className="sap-th" style={{ width: 110 }}>Mat. Group</th>
                <th className="sap-th" style={{ width: 120 }}>Delivery Date</th>
                <th className="sap-th" style={{ width: 110, textAlign: 'right' }}>Total</th>
                <th className="sap-th" style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="sap-tr">
                  <td className="sap-td" style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>{item.item_number}</td>
                  <td className="sap-td">
                    <SapInput value={item.material_number} onChange={e => updateItem(i, 'material_number', e.target.value)} placeholder="MAT-XXX" />
                  </td>
                  <td className="sap-td">
                    <SapInput value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description..." />
                  </td>
                  <td className="sap-td">
                    <SapInput type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.001" step="1" />
                  </td>
                  <td className="sap-td">
                    <SapSelect value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                      <option>EA</option><option>PC</option><option>KG</option><option>L</option><option>M</option><option>BOX</option><option>SET</option>
                    </SapSelect>
                  </td>
                  <td className="sap-td">
                    <SapInput type="number" value={item.price_per_unit} onChange={e => updateItem(i, 'price_per_unit', e.target.value)} min="0" step="0.01" />
                  </td>
                  <td className="sap-td">
                    <SapSelect value={item.material_group} onChange={e => updateItem(i, 'material_group', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="01">01 — Office</option>
                      <option value="02">02 — IT Equipment</option>
                      <option value="03">03 — Raw Materials</option>
                      <option value="04">04 — Services</option>
                      <option value="05">05 — Maintenance</option>
                    </SapSelect>
                  </td>
                  <td className="sap-td">
                    <SapInput type="date" value={item.delivery_date} onChange={e => updateItem(i, 'delivery_date', e.target.value)} />
                  </td>
                  <td className="sap-td" style={{ textAlign: 'right' }}>
                    <span className="sap-amount">
                      {(Number(item.quantity) * Number(item.price_per_unit)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="sap-td">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sap-error)', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} style={{ padding: '8px 12px', textAlign: 'right', background: '#fafafa', fontSize: 13, fontWeight: 600 }}>
                  Total Net Value ({form.currency}):
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', background: '#fafafa' }}>
                  <span className="sap-amount-large">{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </td>
                <td style={{ background: '#fafafa' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

interface PRDetailProps {
  id: string;
  onNavigate: (page: AppPage, id?: string) => void;
}

export function PurchaseRequisitionDetail({ id, onNavigate }: PRDetailProps) {
  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('purchase_requisitions')
        .select('*, pr_items(*)')
        .eq('id', id)
        .maybeSingle();
      setPr(data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function updateStatus(status: string) {
    await supabase.from('purchase_requisitions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    const { data } = await supabase.from('purchase_requisitions').select('*, pr_items(*)').eq('id', id).maybeSingle();
    setPr(data);
  }

  if (loading) return <Spinner />;
  if (!pr) return <InfoBox type="error">PR not found.</InfoBox>;

  const items: PRItem[] = pr.pr_items ?? [];

  return (
    <div>
      <ObjectHeader
        number={pr.pr_number}
        title={pr.title}
        status={pr.status}
        attributes={[
          { label: 'Requester', value: pr.requester },
          { label: 'Department', value: pr.department },
          { label: 'Plant', value: pr.plant },
          { label: 'Priority', value: <span className={`sap-status-badge ${pr.priority === 'urgent' ? 'sap-status-error' : 'sap-status-neutral'}`}>{pr.priority}</span> },
          { label: 'Required Date', value: pr.required_date ?? '—' },
          { label: 'Total Value', value: <span className="sap-amount">{pr.currency} {Number(pr.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
          { label: 'Created', value: new Date(pr.created_at).toLocaleString() },
        ]}
        actions={
          <>
            {pr.status === 'draft' && <SapButton variant="secondary" onClick={() => updateStatus('submitted')}>Submit</SapButton>}
            {pr.status === 'submitted' && (
              <>
                <SapButton variant="secondary" onClick={() => updateStatus('approved')}><CheckCircle size={14} /> Approve</SapButton>
                <SapButton variant="destructive" onClick={() => updateStatus('rejected')}><XCircle size={14} /> Reject</SapButton>
              </>
            )}
            {pr.status === 'approved' && (
              <SapButton variant="emphasized" onClick={() => onNavigate('po-create', pr.id)}>
                <ShoppingCartIcon /> Create PO
              </SapButton>
            )}
            <SapButton variant="ghost" onClick={() => onNavigate('pr-list')}>Back</SapButton>
          </>
        }
      />

      {pr.notes && (
        <Section title="Notes">
          <p style={{ fontSize: 13, color: 'var(--sap-text-primary)' }}>{pr.notes}</p>
        </Section>
      )}

      <Section title={`Line Items (${items.length})`}>
        <SapTable
          columns={[
            { key: 'item', label: 'Item', width: '60px' },
            { key: 'material', label: 'Material No.' },
            { key: 'description', label: 'Description' },
            { key: 'qty', label: 'Quantity', align: 'right' },
            { key: 'unit', label: 'Unit' },
            { key: 'price', label: 'Price/Unit', align: 'right' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'mat_group', label: 'Mat. Group' },
            { key: 'delivery', label: 'Delivery Date' },
          ]}
          data={items.map(it => ({
            item: <span style={{ color: 'var(--sap-text-secondary)', fontSize: 12 }}>{it.item_number}</span>,
            material: it.material_number || '—',
            description: it.description,
            qty: Number(it.quantity).toLocaleString(),
            unit: it.unit,
            price: <span className="sap-amount">{Number(it.price_per_unit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            total: <span className="sap-amount">{Number(it.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
            mat_group: it.material_group || '—',
            delivery: it.delivery_date ?? '—',
          }))}
          emptyText="No line items"
        />
      </Section>
    </div>
  );
}

function ShoppingCartIcon() {
  return <FileText size={14} />;
}
