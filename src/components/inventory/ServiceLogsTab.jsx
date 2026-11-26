import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CodeChip, NativeSelect, Pagination, SERVICE_TYPES, label } from './common';
import { CompleteServiceDialog, CancelServiceDialog } from './ItemActions';

export default function ServiceLogsTab({ buildingId, onOpenItem }) {
  const [status, setStatus] = useState('OPEN');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null); // { kind, log }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-service-logs', buildingId, status, type, page],
    queryFn: async () =>
      (await api.get('/tenant/inventory/service-logs', {
        params: { page, limit: 20, ...(status && { status }), ...(type && { type }), ...(buildingId && { buildingId }) },
      })).data,
  });
  const logs = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <NativeSelect className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['OPEN', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </NativeSelect>
        <NativeSelect className="w-44" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          {SERVICE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </NativeSelect>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead><TableHead>Cost</TableHead><TableHead>Opened</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : logs.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No service logs</TableCell></TableRow>
              : logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <button type="button" className="text-left" onClick={() => onOpenItem(l.inventoryItem?.id)}>
                      <p className="font-semibold text-slate-800 dark:text-white hover:underline">{l.inventoryItem?.name}</p>
                      <CodeChip>{l.inventoryItem?.uniqueCode}</CodeChip>
                    </button>
                  </TableCell>
                  <TableCell><StatusBadge status={l.type} /></TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="max-w-xs"><span className="line-clamp-2">{l.description}</span></TableCell>
                  <TableCell>{l.vendor || '-'}</TableCell>
                  <TableCell>{l.cost != null ? formatCurrency(l.cost) : '-'}</TableCell>
                  <TableCell>{formatDate(l.openedAt)}</TableCell>
                  <TableCell>
                    {l.status === 'OPEN' && (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => setAction({ kind: 'complete', log: l })}>Complete</Button>
                        <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'cancel', log: l })}>Cancel</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>
      <CompleteServiceDialog open={action?.kind === 'complete'} onOpenChange={(v) => !v && setAction(null)} log={action?.log} />
      <CancelServiceDialog open={action?.kind === 'cancel'} onOpenChange={(v) => !v && setAction(null)} log={action?.log} />
    </div>
  );
}
