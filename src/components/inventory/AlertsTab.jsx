import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, ShieldAlert, Wrench, CalendarClock, PackageX } from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { CodeChip, Field, NativeSelect, ErrorText, roomLabel } from './common';

function AlertSection({ title, icon: Icon, tone, rows, empty, render }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100/50 dark:border-blue-900/30">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone}`} />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <span className="text-xs text-slate-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="divide-y divide-blue-100/50 dark:divide-blue-900/30 max-h-80 overflow-y-auto">{rows.map(render)}</div>
      )}
    </div>
  );
}

export default function AlertsTab({ buildingId, onOpenItem }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-alerts', buildingId, days],
    queryFn: async () => (await api.get('/tenant/inventory/alerts', { params: { days, ...(buildingId && { buildingId }) } })).data.data,
  });

  const itemRow = (extra) => (i) => (
    <button
      key={i.id} type="button" onClick={() => onOpenItem(i.id)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{i.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {[i.building?.name, i.room && roomLabel(i.room)].filter(Boolean).join(' · ') || '-'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {extra?.(i)}
        <CodeChip>{i.uniqueCode}</CodeChip>
      </div>
    </button>
  );

  if (isLoading) return <p className="py-10 text-center text-slate-400">Loading alerts...</p>;
  if (error) return <ErrorText error={error} />;
  const d = data || {};

  return (
    <div className="space-y-4">
      <Field label="Look-ahead window" className="max-w-[12rem]">
        <NativeSelect value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 15, 30, 60, 90].map((n) => <option key={n} value={n}>Next {n} days</option>)}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertSection
          title="Warranty expiring" icon={ShieldAlert} tone="text-amber-500" rows={d.warrantyExpiring || []} empty="No warranties expiring"
          render={itemRow((i) => <span className="text-xs text-slate-500">{formatDate(i.warrantyUntil)}</span>)}
        />
        <AlertSection
          title="Service due" icon={CalendarClock} tone="text-blue-500" rows={d.serviceDue || []} empty="No services due"
          render={itemRow((i) => (
            <>
              {i.valuation?.serviceDue && <StatusBadge status="OVERDUE" />}
              <span className="text-xs text-slate-500">{formatDate(i.nextServiceDate)}</span>
            </>
          ))}
        />
        <AlertSection
          title="Poor condition" icon={AlertTriangle} tone="text-orange-500" rows={d.poorCondition || []} empty="No items in poor condition"
          render={itemRow((i) => <StatusBadge status={i.condition} />)}
        />
        <AlertSection
          title="Lost items" icon={PackageX} tone="text-red-500" rows={d.lost || []} empty="No lost items"
          render={itemRow()}
        />
        <div className="lg:col-span-2">
          <AlertSection
            title="Open repairs" icon={Wrench} tone="text-violet-500" rows={d.openRepairs || []} empty="No open repairs"
            render={(l) => (
              <button
                key={l.id} type="button" onClick={() => l.inventoryItem?.id && onOpenItem(l.inventoryItem.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{l.inventoryItem?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{l.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={l.type} />
                  <span className="text-xs text-slate-500">Opened {formatDate(l.openedAt)}</span>
                </div>
              </button>
            )}
          />
        </div>
      </div>
    </div>
  );
}
