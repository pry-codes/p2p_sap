import { ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'pr' | 'po' | 'gr' | 'invoice' | 'payment' | 'vendor';
}

const statusColors: Record<string, string> = {
  draft: 'sap-status-neutral',
  submitted: 'sap-status-info',
  approved: 'sap-status-success',
  rejected: 'sap-status-error',
  converted: 'sap-status-success',
  open: 'sap-status-info',
  partially_delivered: 'sap-status-warning',
  fully_delivered: 'sap-status-success',
  invoiced: 'sap-status-success',
  closed: 'sap-status-neutral',
  cancelled: 'sap-status-error',
  parked: 'sap-status-neutral',
  posted: 'sap-status-info',
  paid: 'sap-status-success',
  blocked: 'sap-status-error',
  overdue: 'sap-status-error',
  active: 'sap-status-success',
  posted_gr: 'sap-status-success',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted',
  open: 'Open',
  partially_delivered: 'Partially Delivered',
  fully_delivered: 'Fully Delivered',
  invoiced: 'Invoiced',
  closed: 'Closed',
  cancelled: 'Cancelled',
  parked: 'Parked',
  posted: 'Posted',
  paid: 'Paid',
  blocked: 'Blocked',
  overdue: 'Overdue',
  active: 'Active',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  partially_paid: 'Partially Paid',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = statusColors[status] || 'sap-status-neutral';
  const label = statusLabels[status] || status;
  return <span className={`sap-status-badge ${cls}`}>{label}</span>;
}

interface ObjectHeaderProps {
  title: string;
  subtitle?: string;
  number?: string;
  status?: string;
  attributes?: { label: string; value: string | ReactNode }[];
  actions?: ReactNode;
}

export function ObjectHeader({ title, subtitle, number, status, attributes, actions }: ObjectHeaderProps) {
  return (
    <div className="sap-object-header">
      <div className="sap-object-header-inner">
        <div className="sap-object-header-top">
          <div className="sap-object-header-title-area">
            {number && <span className="sap-object-number">{number}</span>}
            <h1 className="sap-object-title">{title}</h1>
            {subtitle && <span className="sap-object-subtitle">{subtitle}</span>}
            {status && <StatusBadge status={status} />}
          </div>
          {actions && <div className="sap-object-actions">{actions}</div>}
        </div>
        {attributes && attributes.length > 0 && (
          <div className="sap-object-attributes">
            {attributes.map((attr, i) => (
              <div key={i} className="sap-object-attr">
                <span className="sap-object-attr-label">{attr.label}</span>
                <span className="sap-object-attr-value">{attr.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actions?: ReactNode;
}

export function Section({ title, children, actions }: SectionProps) {
  return (
    <div className="sap-section">
      <div className="sap-section-header">
        <h2 className="sap-section-title">{title}</h2>
        {actions && <div className="sap-section-actions">{actions}</div>}
      </div>
      <div className="sap-section-content">{children}</div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
  hint?: string;
}

export function FormField({ label, required, children, error, hint }: FormFieldProps) {
  return (
    <div className="sap-form-field">
      <label className="sap-form-label">
        {label}
        {required && <span className="sap-form-required">*</span>}
      </label>
      <div className="sap-form-control">
        {children}
        {hint && !error && <span className="sap-form-hint">{hint}</span>}
        {error && <span className="sap-form-error">{error}</span>}
      </div>
    </div>
  );
}

export function SapInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`sap-input ${className}`} {...props} />;
}

export function SapSelect({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="sap-select-wrapper">
      <select className={`sap-select ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown size={14} className="sap-select-icon" />
    </div>
  );
}

export function SapTextarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`sap-textarea ${className}`} {...props} />;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'emphasized';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function SapButton({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`sap-btn sap-btn-${variant} sap-btn-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface TableProps {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: string }[];
  data: Record<string, ReactNode>[];
  onRowClick?: (index: number) => void;
  emptyText?: string;
  selectable?: boolean;
}

export function SapTable({ columns, data, onRowClick, emptyText = 'No items found' }: TableProps) {
  return (
    <div className="sap-table-wrapper">
      <table className="sap-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sap-th ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="sap-td-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={`sap-tr ${onRowClick ? 'sap-tr-clickable' : ''}`}
                onClick={() => onRowClick?.(i)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`sap-td ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export function SapModal({ open, title, onClose, children, size = 'md', footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="sap-modal-overlay" onClick={onClose}>
      <div
        className={`sap-modal sap-modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sap-modal-header">
          <h2 className="sap-modal-title">{title}</h2>
          <button className="sap-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="sap-modal-body">{children}</div>
        {footer && <div className="sap-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface InfoBoxProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: ReactNode;
}

export function InfoBox({ type, title, children }: InfoBoxProps) {
  return (
    <div className={`sap-infobox sap-infobox-${type}`}>
      {title && <div className="sap-infobox-title">{title}</div>}
      <div className="sap-infobox-content">{children}</div>
    </div>
  );
}

interface KpiTileProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export function KpiTile({ title, value, unit, trend, trendValue, color = 'blue' }: KpiTileProps) {
  return (
    <div className={`sap-kpi-tile sap-kpi-${color}`}>
      <div className="sap-kpi-value">
        {value}
        {unit && <span className="sap-kpi-unit">{unit}</span>}
      </div>
      <div className="sap-kpi-title">{title}</div>
      {trendValue && (
        <div className={`sap-kpi-trend sap-kpi-trend-${trend}`}>
          {trend === 'up' ? <ChevronUp size={12} /> : trend === 'down' ? <ChevronDown size={12} /> : null}
          {trendValue}
        </div>
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="sap-spinner-wrap">
      <div className="sap-spinner" />
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  return <div className={`sap-form-row sap-form-cols-${cols}`}>{children}</div>;
}
