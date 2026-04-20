import { Bell, Search, User, Grid3x3 as Grid3X3, ChevronDown, Settings, HelpCircle } from 'lucide-react';
import { AppPage } from '../types';

interface ShellBarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  breadcrumbs?: { label: string; page?: AppPage }[];
}

export function ShellBar({ currentPage, onNavigate, breadcrumbs }: ShellBarProps) {
  return (
    <div className="sap-shell">
      <div className="sap-shell-bar">
        <div className="sap-shell-left">
          <button
            className="sap-shell-icon-btn"
            onClick={() => onNavigate('launchpad')}
            title="Home"
          >
            <Grid3X3 size={20} />
          </button>
          <div className="sap-shell-brand" onClick={() => onNavigate('launchpad')}>
            <span className="sap-shell-logo">SAP</span>
            <div className="sap-shell-divider" />
            <div className="sap-shell-app-name">
              <span className="sap-shell-app-title">SAP MM</span>
              <span className="sap-shell-app-subtitle">Procure-to-Pay</span>
            </div>
          </div>
        </div>

        <div className="sap-shell-center">
          <div className="sap-shell-search">
            <Search size={14} className="sap-shell-search-icon" />
            <input placeholder="Search..." className="sap-shell-search-input" />
          </div>
        </div>

        <div className="sap-shell-right">
          <button className="sap-shell-icon-btn" title="Notifications">
            <Bell size={18} />
            <span className="sap-shell-badge">3</span>
          </button>
          <button className="sap-shell-icon-btn" title="Help">
            <HelpCircle size={18} />
          </button>
          <button className="sap-shell-icon-btn" title="Settings">
            <Settings size={18} />
          </button>
          <button className="sap-shell-user-btn">
            <div className="sap-shell-avatar">MM</div>
            <span className="sap-shell-username">MM Manager</span>
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="sap-breadcrumb-bar">
          <nav className="sap-breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="sap-breadcrumb-item">
                {i > 0 && <span className="sap-breadcrumb-sep">/</span>}
                {crumb.page ? (
                  <button
                    className="sap-breadcrumb-link"
                    onClick={() => onNavigate(crumb.page!)}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="sap-breadcrumb-current">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

interface SideNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const navItems = [
  {
    group: 'Purchase Requisition',
    tcode: 'ME51N',
    items: [
      { label: 'My Requisitions', page: 'pr-list' as AppPage },
      { label: 'Create PR', page: 'pr-create' as AppPage },
    ],
  },
  {
    group: 'Purchase Order',
    tcode: 'ME21N',
    items: [
      { label: 'Purchase Orders', page: 'po-list' as AppPage },
      { label: 'Create PO', page: 'po-create' as AppPage },
    ],
  },
  {
    group: 'Goods Receipt',
    tcode: 'MIGO',
    items: [
      { label: 'GR Documents', page: 'gr-list' as AppPage },
      { label: 'Post GR', page: 'gr-create' as AppPage },
    ],
  },
  {
    group: 'Invoice Verification',
    tcode: 'MIRO',
    items: [
      { label: 'Invoices', page: 'invoice-list' as AppPage },
      { label: 'Enter Invoice', page: 'invoice-create' as AppPage },
    ],
  },
  {
    group: 'Master Data',
    tcode: 'XK01',
    items: [
      { label: 'Vendors', page: 'vendor-list' as AppPage },
      { label: 'Cycle Monitor', page: 'cycle-tracker' as AppPage },
    ],
  },
];

export function SideNav({ currentPage, onNavigate }: SideNavProps) {
  return (
    <div className="sap-sidenav">
      {navItems.map((group) => (
        <div key={group.group} className="sap-sidenav-group">
          <div className="sap-sidenav-group-header">
            <span className="sap-sidenav-tcode">{group.tcode}</span>
            <span className="sap-sidenav-group-label">{group.group}</span>
          </div>
          {group.items.map((item) => (
            <button
              key={item.page}
              className={`sap-sidenav-item ${currentPage === item.page ? 'active' : ''}`}
              onClick={() => onNavigate(item.page)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

interface User {
  label: string;
}
