import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  SapTable, StatusBadge, SapButton, FormField, FormRow,
  SapInput, SapSelect, Section, Spinner, InfoBox, SapModal
} from '../components/SapUI';
import { Vendor, AppPage } from '../types';

interface Props {
  onNavigate: (page: AppPage) => void;
}

function genVendorNumber() {
  return 'V-' + String(10000 + Math.floor(Math.random() * 90000));
}

export function VendorList({ onNavigate }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', country: 'US', city: '', street: '', payment_terms: 'Net 30', currency: 'USD', contact_email: '', contact_phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchVendors(); }, []);

  async function fetchVendors() {
    setLoading(true);
    const { data } = await supabase.from('vendors').select('*').order('vendor_number');
    setVendors(data ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Vendor name is required'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('vendors').insert({ ...form, vendor_number: genVendorNumber(), status: 'active' });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    setShowCreate(false);
    setForm({ name: '', country: 'US', city: '', street: '', payment_terms: 'Net 30', currency: 'USD', contact_email: '', contact_phone: '' });
    fetchVendors();
  }

  const tableData = vendors.map(v => ({
    vendor_number: <span className="sap-doc-number">{v.vendor_number}</span>,
    name: <span style={{ fontWeight: 500 }}>{v.name}</span>,
    country: <span className="sap-tag">{v.country}</span>,
    city: v.city,
    payment: v.payment_terms,
    currency: v.currency,
    email: v.contact_email || '—',
    phone: v.contact_phone || '—',
    status: <StatusBadge status={v.status} />,
  }));

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">XK03 — Vendor Master</div>
          <h1>Vendor Master Data</h1>
          <div className="sap-page-header-desc">Manage supplier records — XK01/XK02/XK03</div>
        </div>
        <div className="sap-page-header-actions">
          <SapButton variant="emphasized" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Vendor
          </SapButton>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="sap-section">
          <SapTable
            columns={[
              { key: 'vendor_number', label: 'Vendor No.', width: '110px' },
              { key: 'name', label: 'Name' },
              { key: 'country', label: 'Country', width: '80px' },
              { key: 'city', label: 'City' },
              { key: 'payment', label: 'Payment Terms' },
              { key: 'currency', label: 'Currency', width: '80px' },
              { key: 'email', label: 'Contact Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'status', label: 'Status', width: '90px' },
            ]}
            data={tableData}
            emptyText="No vendors found."
          />
        </div>
      )}

      <SapModal
        open={showCreate}
        title="Create Vendor (XK01)"
        onClose={() => { setShowCreate(false); setError(''); }}
        size="lg"
        footer={
          <>
            <SapButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</SapButton>
            <SapButton variant="emphasized" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving...' : 'Create Vendor'}
            </SapButton>
          </>
        }
      >
        {error && <InfoBox type="error">{error}</InfoBox>}
        <Section title="General Data">
          <FormRow cols={2}>
            <FormField label="Vendor Name" required>
              <SapInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Company name" />
            </FormField>
            <FormField label="Country">
              <SapSelect value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}>
                <option value="US">US — United States</option>
                <option value="DE">DE — Germany</option>
                <option value="FR">FR — France</option>
                <option value="GB">GB — United Kingdom</option>
                <option value="JP">JP — Japan</option>
                <option value="SE">SE — Sweden</option>
                <option value="CN">CN — China</option>
              </SapSelect>
            </FormField>
          </FormRow>
          <FormRow cols={2}>
            <FormField label="City">
              <SapInput value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </FormField>
            <FormField label="Street">
              <SapInput value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} />
            </FormField>
          </FormRow>
        </Section>
        <Section title="Company Code & Payment">
          <FormRow cols={2}>
            <FormField label="Payment Terms">
              <SapSelect value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}>
                <option>Net 30</option><option>Net 45</option><option>Net 60</option>
                <option>2/10 Net 30</option><option>Immediate</option>
              </SapSelect>
            </FormField>
            <FormField label="Currency">
              <SapSelect value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="USD">USD</option><option value="EUR">EUR</option>
                <option value="GBP">GBP</option><option value="JPY">JPY</option>
              </SapSelect>
            </FormField>
          </FormRow>
          <FormRow cols={2}>
            <FormField label="Contact Email">
              <SapInput type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} />
            </FormField>
            <FormField label="Contact Phone">
              <SapInput value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
            </FormField>
          </FormRow>
        </Section>
      </SapModal>
    </div>
  );
}
