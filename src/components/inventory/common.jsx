import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
export const ITEM_STATUSES = ['IN_USE', 'IN_STORAGE', 'UNDER_REPAIR', 'LOST', 'DISPOSED'];
export const SETTABLE_STATUSES = ['IN_USE', 'IN_STORAGE', 'LOST'];
export const SERVICE_TYPES = ['REPAIR', 'SERVICE', 'INSPECTION'];
export const ATTACHMENT_KINDS = ['IMAGE', 'INVOICE', 'WARRANTY', 'OTHER'];

export const selectClass =
  'flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all disabled:opacity-50';

export const textareaClass =
  'flex w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all';

export function NativeSelect({ className, children, ...props }) {
  return <select className={cn(selectClass, className)} {...props}>{children}</select>;
}

export function Field({ label, error, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white break-words">{value || value === 0 ? value : '-'}</p>
    </div>
  );
}

export function SectionTitle({ children, className }) {
  return (
    <p className={cn('text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3', className)}>
      {children}
    </p>
  );
}

export function ErrorText({ error }) {
  const msg = errorMessage(error);
  return msg ? <p className="text-sm text-red-500">{msg}</p> : null;
}

export { errorMessage };

export function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('inventory'),
    });
}

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings-list'],
    queryFn: async () => (await api.get('/tenant/buildings', { params: { limit: 100 } })).data.data,
  });
}

export function useRooms(buildingId, enabled = true) {
  return useQuery({
    queryKey: ['rooms-by-building', buildingId || 'all'],
    queryFn: async () =>
      (await api.get('/tenant/rooms', { params: { limit: 200, ...(buildingId && { buildingId }) } })).data.data,
    enabled,
  });
}

export function useResidents(enabled = true) {
  return useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => (await api.get('/tenant/residents', { params: { limit: 200, status: 'ACTIVE' } })).data.data,
    enabled,
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => (await api.get('/tenant/inventory/categories')).data.data,
  });
}

export const roomLabel = (r) => (r ? [r.name, r.number && r.number !== r.name ? `(${r.number})` : ''].filter(Boolean).join(' ') : '');
export const personName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');
export const label = (v) => (v ? String(v).replace(/_/g, ' ') : '-');

/** Drop empty strings/undefined, convert numeric fields. */
export function cleanPayload(form, { numberFields = [], intFields = [] } = {}) {
  const out = {};
  Object.entries(form).forEach(([k, v]) => {
    if (v === '' || v === undefined || v === null) return;
    if (numberFields.includes(k)) out[k] = Number(v);
    else if (intFields.includes(k)) out[k] = parseInt(v, 10);
    else out[k] = typeof v === 'string' ? v.trim() : v;
  });
  return out;
}

export const formatDateTime = (d) =>
  d ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '-';

export const toDateInput = (d) => (d ? String(d).slice(0, 10) : '');

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-blue-100/50 dark:border-blue-900/30">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => onPage(pagination.page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TabBar({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-blue-50/60 dark:bg-slate-800/50 p-1 w-fit max-w-full">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all',
            value === t.value
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'
          )}
        >
          {t.label}
          {t.count > 0 && (
            <span className="ml-1.5 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function CodeChip({ children }) {
  return (
    <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
      {children}
    </span>
  );
}
