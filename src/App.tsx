import { useState } from 'react';
import { ShellBar, SideNav } from './components/ShellBar';
import { Launchpad } from './pages/Launchpad';
import {
  PurchaseRequisitionList,
  PurchaseRequisitionCreate,
  PurchaseRequisitionDetail
} from './pages/PurchaseRequisitions';
import {
  PurchaseOrderList,
  PurchaseOrderCreate,
  PurchaseOrderDetail
} from './pages/PurchaseOrders';
import {
  GoodsReceiptList,
  GoodsReceiptCreate,
  GoodsReceiptDetail
} from './pages/GoodsReceipt';
import {
  InvoiceList,
  InvoiceCreate,
  InvoiceDetail
} from './pages/InvoiceVerification';
import { CycleTracker } from './pages/CycleTracker';
import { VendorList } from './pages/VendorList';
import { AppPage } from './types';

const breadcrumbMap: Record<AppPage, { label: string; parent?: AppPage }> = {
  launchpad: { label: 'Launchpad' },
  'pr-list': { label: 'Purchase Requisitions', parent: 'launchpad' },
  'pr-create': { label: 'Create PR', parent: 'pr-list' },
  'pr-detail': { label: 'PR Detail', parent: 'pr-list' },
  'po-list': { label: 'Purchase Orders', parent: 'launchpad' },
  'po-create': { label: 'Create PO', parent: 'po-list' },
  'po-detail': { label: 'PO Detail', parent: 'po-list' },
  'gr-list': { label: 'Goods Receipts', parent: 'launchpad' },
  'gr-create': { label: 'Post GR', parent: 'gr-list' },
  'gr-detail': { label: 'GR Document', parent: 'gr-list' },
  'invoice-list': { label: 'Invoice Verification', parent: 'launchpad' },
  'invoice-create': { label: 'Enter Invoice', parent: 'invoice-list' },
  'invoice-detail': { label: 'Invoice Detail', parent: 'invoice-list' },
  'cycle-tracker': { label: 'P2P Monitor', parent: 'launchpad' },
  'vendor-list': { label: 'Vendors', parent: 'launchpad' },
};

function buildBreadcrumbs(page: AppPage): { label: string; page?: AppPage }[] {
  const crumbs: { label: string; page?: AppPage }[] = [];
  let current: AppPage | undefined = page;
  while (current) {
    const info = breadcrumbMap[current];
    crumbs.unshift({ label: info.label, page: info.parent ? current : undefined });
    current = info.parent;
  }
  crumbs[crumbs.length - 1].page = undefined;
  return crumbs;
}

export default function App() {
  const [page, setPage] = useState<AppPage>('launchpad');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [contextId, setContextId] = useState<string | undefined>();

  function navigate(newPage: AppPage, id?: string) {
    setPage(newPage);
    if (['pr-detail', 'po-detail', 'gr-detail', 'invoice-detail'].includes(newPage)) {
      setSelectedId(id);
      setContextId(undefined);
    } else if (['po-create', 'gr-create', 'invoice-create'].includes(newPage)) {
      setContextId(id);
      setSelectedId(undefined);
    } else {
      setSelectedId(undefined);
      setContextId(undefined);
    }
    window.scrollTo(0, 0);
  }

  const breadcrumbs = buildBreadcrumbs(page);

  function renderPage() {
    switch (page) {
      case 'launchpad':
        return <Launchpad onNavigate={navigate} />;
      case 'pr-list':
        return <PurchaseRequisitionList onNavigate={navigate} />;
      case 'pr-create':
        return <PurchaseRequisitionCreate onNavigate={navigate} />;
      case 'pr-detail':
        return selectedId ? <PurchaseRequisitionDetail id={selectedId} onNavigate={navigate} /> : null;
      case 'po-list':
        return <PurchaseOrderList onNavigate={navigate} />;
      case 'po-create':
        return <PurchaseOrderCreate onNavigate={navigate} prId={contextId} />;
      case 'po-detail':
        return <PurchaseOrderDetail onNavigate={navigate} selectedId={selectedId} />;
      case 'gr-list':
        return <GoodsReceiptList onNavigate={navigate} />;
      case 'gr-create':
        return <GoodsReceiptCreate onNavigate={navigate} poId={contextId} />;
      case 'gr-detail':
        return <GoodsReceiptDetail onNavigate={navigate} selectedId={selectedId} />;
      case 'invoice-list':
        return <InvoiceList onNavigate={navigate} />;
      case 'invoice-create':
        return <InvoiceCreate onNavigate={navigate} poId={contextId} />;
      case 'invoice-detail':
        return <InvoiceDetail onNavigate={navigate} selectedId={selectedId} />;
      case 'cycle-tracker':
        return <CycleTracker onNavigate={navigate} />;
      case 'vendor-list':
        return <VendorList onNavigate={navigate} />;
      default:
        return <Launchpad onNavigate={navigate} />;
    }
  }

  return (
    <>
      <ShellBar
        currentPage={page}
        onNavigate={navigate}
        breadcrumbs={breadcrumbs}
      />
      <div className="sap-layout">
        <SideNav currentPage={page} onNavigate={navigate} />
        <main className="sap-main-content">
          {renderPage()}
        </main>
      </div>
    </>
  );
}
