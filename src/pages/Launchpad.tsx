import { useEffect, useState } from 'react';
import {
  ShoppingCart, FileText, Package, Receipt, BarChart3,
  Users, TrendingUp, AlertCircle, CheckCircle, Clock, Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { KpiTile, Spinner } from '../components/SapUI';
import { AppPage } from '../types';

interface LaunchpadProps {
  onNavigate: (page: AppPage) => void;
}

interface Counts {
  prs: number;
  pos: number;
  grs: number;
  invoices: number;
  pendingPrs: number;
  openPos: number;
  pendingInvoices: number;
  vendors: number;
}

export function Launchpad({ onNavigate }: LaunchpadProps) {
  const [counts, setCounts] = useState<Counts>({
    prs: 0, pos: 0, grs: 0, invoices: 0,
    pendingPrs: 0, openPos: 0, pendingInvoices: 0, vendors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [prRes, poRes, grRes, invRes, vendRes] = await Promise.all([
        supabase.from('purchase_requisitions').select('id, status'),
        supabase.from('purchase_orders').select('id, status'),
        supabase.from('goods_receipts').select('id'),
        supabase.from('invoices').select('id, status'),
        supabase.from('vendors').select('id'),
      ]);
      setCounts({
        prs: prRes.data?.length ?? 0,
        pos: poRes.data?.length ?? 0,
        grs: grRes.data?.length ?? 0,
        invoices: invRes.data?.length ?? 0,
        pendingPrs: prRes.data?.filter(r => r.status === 'submitted').length ?? 0,
        openPos: poRes.data?.filter(r => r.status === 'open').length ?? 0,
        pendingInvoices: invRes.data?.filter(r => r.status === 'parked').length ?? 0,
        vendors: vendRes.data?.length ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const tileGroups = [
    {
      title: 'Procurement',
      tiles: [
        {
          icon: <FileText size={20} />,
          title: 'Create Purchase Requisition',
          subtitle: 'ME51N',
          tcode: 'ME51N',
          count: null,
          color: '#0070f2',
          page: 'pr-create' as AppPage,
        },
        {
          icon: <FileText size={20} />,
          title: 'My Purchase Requisitions',
          subtitle: 'ME52N',
          tcode: 'ME52N',
          count: counts.prs,
          color: '#0070f2',
          page: 'pr-list' as AppPage,
        },
        {
          icon: <ShoppingCart size={20} />,
          title: 'Create Purchase Order',
          subtitle: 'ME21N',
          tcode: 'ME21N',
          count: null,
          color: '#107e3e',
          page: 'po-create' as AppPage,
        },
        {
          icon: <ShoppingCart size={20} />,
          title: 'Purchase Orders',
          subtitle: 'ME23N',
          tcode: 'ME23N',
          count: counts.pos,
          color: '#107e3e',
          page: 'po-list' as AppPage,
        },
      ],
    },
    {
      title: 'Inventory & Finance',
      tiles: [
        {
          icon: <Package size={20} />,
          title: 'Post Goods Receipt',
          subtitle: 'MIGO',
          tcode: 'MIGO',
          count: null,
          color: '#e76500',
          page: 'gr-create' as AppPage,
        },
        {
          icon: <Package size={20} />,
          title: 'GR Documents',
          subtitle: 'MB51',
          tcode: 'MB51',
          count: counts.grs,
          color: '#e76500',
          page: 'gr-list' as AppPage,
        },
        {
          icon: <Receipt size={20} />,
          title: 'Enter Invoice',
          subtitle: 'MIRO',
          tcode: 'MIRO',
          count: null,
          color: '#6a6d73',
          page: 'invoice-create' as AppPage,
        },
        {
          icon: <Receipt size={20} />,
          title: 'Invoice Verification',
          subtitle: 'MIR4',
          tcode: 'MIR4',
          count: counts.invoices,
          color: '#6a6d73',
          page: 'invoice-list' as AppPage,
        },
      ],
    },
    {
      title: 'Analytics & Master Data',
      tiles: [
        {
          icon: <BarChart3 size={20} />,
          title: 'P2P Cycle Monitor',
          subtitle: 'ME2M',
          tcode: 'ME2M',
          count: null,
          color: '#0070f2',
          page: 'cycle-tracker' as AppPage,
        },
        {
          icon: <Users size={20} />,
          title: 'Vendor Master',
          subtitle: 'XK03',
          tcode: 'XK03',
          count: counts.vendors,
          color: '#107e3e',
          page: 'vendor-list' as AppPage,
        },
      ],
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-blue)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
          SAP Fiori Launchpad
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 4 }}>
          Materials Management — Procure-to-Pay
        </h1>
        <p style={{ fontSize: 13, color: 'var(--sap-text-secondary)' }}>
          Full P2P cycle: PR → PO → GR → IV | Plant 1000 | Purchasing Org PO01
        </p>
      </div>

      <div className="sap-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiTile title="Open Purchase Requisitions" value={counts.pendingPrs} color="blue" trend="up" trendValue="Pending approval" />
        <KpiTile title="Open Purchase Orders" value={counts.openPos} color="green" trend="neutral" trendValue="Awaiting delivery" />
        <KpiTile title="Parked Invoices" value={counts.pendingInvoices} color="orange" trend="down" trendValue="Need posting" />
        <KpiTile title="Active Vendors" value={counts.vendors} color="blue" />
        <KpiTile title="Total PRs" value={counts.prs} color="green" />
        <KpiTile title="Total POs" value={counts.pos} color="blue" />
        <KpiTile title="Goods Receipts" value={counts.grs} color="green" />
        <KpiTile title="Total Invoices" value={counts.invoices} color="orange" />
      </div>

      <div style={{
        background: '#ffffff', border: '1px solid var(--sap-border)',
        borderLeft: '4px solid var(--sap-blue)',
        borderRadius: 'var(--sap-radius)', padding: '10px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <TrendingUp size={16} style={{ color: 'var(--sap-blue)', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--sap-text-primary)' }}>
          <strong>P2P Cycle:</strong> Purchase Requisition &rarr; Purchase Order &rarr; Goods Receipt &rarr; Invoice Verification &rarr; Payment
        </div>
      </div>

      {tileGroups.map((group) => (
        <div key={group.title} className="sap-tile-group">
          <div className="sap-tile-group-title">{group.title}</div>
          <div className="sap-launchpad">
            {group.tiles.map((tile) => (
              <div
                key={tile.page}
                className="sap-app-tile"
                onClick={() => onNavigate(tile.page)}
              >
                <span className="sap-app-tile-tcode">{tile.tcode}</span>
                <div
                  className="sap-app-tile-icon"
                  style={{ background: tile.color }}
                >
                  {tile.icon}
                </div>
                {tile.count !== null && (
                  <div className="sap-app-tile-count">{tile.count}</div>
                )}
                {tile.count === null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: tile.color }}>
                    <Plus size={14} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Create New</span>
                  </div>
                )}
                <div>
                  <div className="sap-app-tile-title">{tile.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 8, padding: '12px 16px',
        background: '#ffffff', border: '1px solid var(--sap-border)',
        borderRadius: 'var(--sap-radius)', display: 'flex', gap: 24, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} style={{ color: 'var(--sap-success)' }} />
          <span style={{ fontSize: 11, color: 'var(--sap-text-secondary)' }}>System: Connected to Supabase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} style={{ color: 'var(--sap-warning)' }} />
          <span style={{ fontSize: 11, color: 'var(--sap-text-secondary)' }}>Approval workflow active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} style={{ color: 'var(--sap-blue)' }} />
          <span style={{ fontSize: 11, color: 'var(--sap-text-secondary)' }}>Last sync: {new Date().toLocaleTimeString()}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--sap-text-secondary)' }}>SAP MM | Release 2024 | Plant 1000 | Company Code US01</span>
      </div>
    </div>
  );
}
