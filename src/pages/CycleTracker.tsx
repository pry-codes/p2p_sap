import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Section, StatusBadge, SapButton, Spinner, KpiTile } from '../components/SapUI';
import { AppPage, PurchaseOrder, Vendor, PurchaseRequisition } from '../types';

interface Props {
  onNavigate: (page: AppPage, id?: string) => void;
}

interface CycleRecord {
  po: PurchaseOrder & { vendor?: Vendor; purchase_requisition?: PurchaseRequisition };
  hasGR: boolean;
  hasInvoice: boolean;
  invoicePaid: boolean;
  grCount: number;
  invoiceCount: number;
  cycleStep: number;
}

function getStepState(cycleStep: number, step: number): 'done' | 'active' | 'pending' {
  if (cycleStep > step) return 'done';
  if (cycleStep === step) return 'active';
  return 'pending';
}

export function CycleTracker({ onNavigate }: Props) {
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('*, vendor:vendors(*), purchase_requisition:purchase_requisitions(pr_number, title, status)')
        .order('created_at', { ascending: false });

      if (!pos) { setLoading(false); return; }

      const [{ data: grs }, { data: invs }] = await Promise.all([
        supabase.from('goods_receipts').select('po_id'),
        supabase.from('invoices').select('po_id, status, payment_status'),
      ]);

      const records: CycleRecord[] = pos.map(po => {
        const poGRs = (grs ?? []).filter(g => g.po_id === po.id);
        const poInvs = (invs ?? []).filter(i => i.po_id === po.id);
        const hasGR = poGRs.length > 0;
        const hasInvoice = poInvs.length > 0;
        const invoicePaid = poInvs.some(i => i.payment_status === 'paid');

        let cycleStep = 1;
        if (po.pr_id) cycleStep = 2;
        if (po.status !== 'open' || hasGR) cycleStep = 3;
        if (hasGR) cycleStep = 4;
        if (hasInvoice) cycleStep = 5;
        if (invoicePaid) cycleStep = 6;

        return { po, hasGR, hasInvoice, invoicePaid, grCount: poGRs.length, invoiceCount: poInvs.length, cycleStep };
      });

      setCycles(records);
      setLoading(false);
    }
    load();
  }, []);

  const steps = [
    { label: 'PR Created', icon: '📋' },
    { label: 'PO Created', icon: '🛒' },
    { label: 'PO Sent', icon: '📤' },
    { label: 'GR Posted', icon: '📦' },
    { label: 'Invoice Verified', icon: '🧾' },
    { label: 'Payment', icon: '✅' },
  ];

  const kpiData = {
    total: cycles.length,
    complete: cycles.filter(c => c.cycleStep >= 6).length,
    pending_gr: cycles.filter(c => c.cycleStep === 3).length,
    pending_inv: cycles.filter(c => c.cycleStep === 4).length,
    pending_pay: cycles.filter(c => c.cycleStep === 5).length,
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="sap-page-header">
        <div className="sap-page-header-info">
          <div className="sap-page-header-tcode">ME2M — P2P Cycle Monitor</div>
          <h1>Procure-to-Pay Cycle Monitor</h1>
          <div className="sap-page-header-desc">Full cycle visibility: PR → PO → GR → Invoice → Payment</div>
        </div>
      </div>

      <div className="sap-kpi-grid" style={{ marginBottom: 16 }}>
        <KpiTile title="Total PO Cycles" value={kpiData.total} color="blue" />
        <KpiTile title="Completed Cycles" value={kpiData.complete} color="green" />
        <KpiTile title="Pending GR" value={kpiData.pending_gr} color="orange" />
        <KpiTile title="Awaiting Invoice" value={kpiData.pending_inv} color="orange" />
        <KpiTile title="Awaiting Payment" value={kpiData.pending_pay} color="red" />
      </div>

      <Section title="P2P Cycle Process — Reference">
        <div className="sap-workflow">
          {steps.map((step, i) => (
            <div key={i} className="sap-workflow-step done">
              <div className="sap-workflow-dot">{step.icon}</div>
              <div className="sap-workflow-label">{step.label}</div>
              <div className="sap-workflow-sublabel">Step {i + 1}</div>
            </div>
          ))}
        </div>
      </Section>

      {cycles.length === 0 ? (
        <div className="sap-section">
          <div className="sap-empty-state">
            <div className="sap-empty-title">No Purchase Orders Found</div>
            <div className="sap-empty-desc">Create a purchase order to start tracking the P2P cycle.</div>
            <SapButton variant="emphasized" onClick={() => onNavigate('po-create')}>Create Purchase Order</SapButton>
          </div>
        </div>
      ) : (
        cycles.map((cycle) => (
          <div key={cycle.po.id} style={{
            background: '#ffffff', border: '1px solid var(--sap-border)',
            borderRadius: 4, marginBottom: 12, overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 16px', background: '#fafafa',
              borderBottom: '1px solid var(--sap-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sap-doc-number">{cycle.po.po_number}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{cycle.po.vendor?.name}</span>
                <span className="sap-tag">{cycle.po.vendor?.vendor_number}</span>
                <StatusBadge status={cycle.po.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--sap-text-secondary)' }}>
                  {cycle.po.currency} {Number(cycle.po.total_gross_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <SapButton variant="ghost" size="sm" onClick={() => onNavigate('po-detail', cycle.po.id)}>View PO</SapButton>
              </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
              <div className="sap-workflow">
                {[
                  { label: 'Purchase Requisition', sublabel: cycle.po.purchase_requisition ? (cycle.po.purchase_requisition as PurchaseRequisition).pr_number : 'Direct PO', done: !!cycle.po.pr_id, step: 1 },
                  { label: 'Purchase Order', sublabel: cycle.po.po_number, done: true, step: 2 },
                  { label: 'PO to Vendor', sublabel: new Date(cycle.po.order_date).toLocaleDateString(), done: true, step: 3 },
                  { label: 'Goods Receipt', sublabel: cycle.hasGR ? `${cycle.grCount} GR doc(s)` : 'Pending', done: cycle.hasGR, step: 4 },
                  { label: 'Invoice Verification', sublabel: cycle.hasInvoice ? `${cycle.invoiceCount} invoice(s)` : 'Pending', done: cycle.hasInvoice, step: 5 },
                  { label: 'Payment', sublabel: cycle.invoicePaid ? 'Paid' : 'Pending', done: cycle.invoicePaid, step: 6 },
                ].map((step, i) => {
                  const state = step.done ? 'done' : cycle.cycleStep === step.step ? 'active' : 'pending';
                  return (
                    <div key={i} className={`sap-workflow-step ${state}`}>
                      <div className="sap-workflow-dot">
                        {state === 'done' ? <CheckCircle size={18} /> : state === 'active' ? <Clock size={18} /> : <Circle size={18} />}
                      </div>
                      <div className="sap-workflow-label">{step.label}</div>
                      <div className="sap-workflow-sublabel" style={{ maxWidth: 100 }}>{step.sublabel}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                {!cycle.hasGR && cycle.po.status !== 'cancelled' && (
                  <SapButton variant="secondary" size="sm" onClick={() => onNavigate('gr-create', cycle.po.id)}>
                    Post GR
                  </SapButton>
                )}
                {cycle.hasGR && !cycle.hasInvoice && (
                  <SapButton variant="secondary" size="sm" onClick={() => onNavigate('invoice-create', cycle.po.id)}>
                    Enter Invoice
                  </SapButton>
                )}
                {cycle.hasInvoice && !cycle.invoicePaid && (
                  <SapButton variant="secondary" size="sm" onClick={() => onNavigate('invoice-list')}>
                    Process Payment
                  </SapButton>
                )}
                {cycle.invoicePaid && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--sap-success)', fontSize: 12, fontWeight: 600 }}>
                    <CheckCircle size={14} /> Cycle Complete
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
