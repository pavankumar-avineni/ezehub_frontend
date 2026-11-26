import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRightLeft, FileText, Pencil, QrCode, RotateCcw, Trash2, Upload, UserMinus, UserPlus, Wrench, Archive, Activity, X,
} from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ATTACHMENT_KINDS, DetailField, ErrorText, NativeSelect, Pagination, SectionTitle, TabBar, CodeChip,
  useInvalidateInventory, formatDateTime, label, personName, roomLabel,
} from './common';
import ItemFormDialog from './ItemFormDialog';
import TransferDialog from './TransferDialog';
import {
  AssignDialog, UnassignDialog, StatusDialog, DisposeDialog, DeleteDialog, OpenServiceDialog,
  CompleteServiceDialog, CancelServiceDialog, QrDialog, RestoreDialog,
} from './ItemActions';

function ServiceLogCard({ log, onComplete, onCancel }) {
  return (
    <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><StatusBadge status={log.type} /><StatusBadge status={log.status} /></div>
        <span className="text-xs text-slate-500">{formatDate(log.openedAt)}</span>
      </div>
      <p className="text-sm text-slate-800 dark:text-white">{log.description}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {[log.vendor && `Vendor: ${log.vendor}`, log.cost != null && `Cost: ${formatCurrency(log.cost)}`, log.completedAt && `Closed: ${formatDate(log.completedAt)}`].filter(Boolean).join(' · ')}
      </p>
      {log.resolution && <p className="text-xs text-slate-600 dark:text-slate-300">Resolution: {log.resolution}</p>}
      {log.status === 'OPEN' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onComplete(log)}>Complete</Button>
          <Button size="sm" variant="outline" onClick={() => onCancel(log)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ itemId }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-history', itemId, page],
    queryFn: async () => (await api.get(`/tenant/inventory/${itemId}/history`, { params: { page, limit: 10 } })).data,
  });
  const rows = data?.data || [];

  const where = (r) => {
    const from = [r.fromBuilding?.name, roomLabel(r.fromRoom)].filter(Boolean).join(' / ');
    const to = [r.toBuilding?.name, roomLabel(r.toRoom)].filter(Boolean).join(' / ');
    if (from || to) return `${from || 'Storage'} → ${to || 'Storage'}`;
    return null;
  };

  if (isLoading) return <p className="py-8 text-center text-slate-400">Loading history...</p>;
  if (!rows.length) return <p className="py-8 text-center text-slate-400">No history yet</p>;
  return (
    <div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{label(r.action)}</span>
              <span className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {[
                where(r),
                r.resident && `Resident: ${personName(r.resident)}`,
                r.status && `Status: ${label(r.status)}`,
                r.performedByUser && `By ${personName(r.performedByUser)}`,
              ].filter(Boolean).join(' · ')}
            </p>
            {r.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.notes}</p>}
          </div>
        ))}
      </div>
      <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
    </div>
  );
}

function FilesTab({ item, readOnly }) {
  const inputRef = useRef(null);
  const [kind, setKind] = useState('IMAGE');
  const invalidate = useInvalidateInventory();
  const attachments = item.attachments || [];

  const upload = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      return api.post(`/tenant/inventory/${item.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (attachmentId) => api.delete(`/tenant/inventory/${item.id}/attachments/${attachmentId}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect className="w-40" value={kind} onChange={(e) => setKind(e.target.value)}>
            {ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}
          </NativeSelect>
          <input
            ref={inputRef} type="file" className="hidden" accept="image/*,application/pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }}
          />
          <Button variant="outline" disabled={upload.isPending || attachments.length >= 20} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {upload.isPending ? 'Uploading...' : 'Upload File'}
          </Button>
          <span className="text-xs text-slate-500">{attachments.length}/20</span>
        </div>
      )}
      <ErrorText error={upload.error || remove.error} />
      {!attachments.length ? <p className="py-6 text-center text-slate-400">No attachments</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((a) => {
            const isImg = a.mimeType?.startsWith('image/');
            return (
              <div key={a.id} className="relative rounded-xl border border-blue-100/60 dark:border-blue-900/30 overflow-hidden group">
                <a href={a.url} target="_blank" rel="noreferrer" className="block">
                  {isImg
                    ? <img src={a.url} alt={a.name} className="h-24 w-full object-cover" />
                    : <div className="h-24 flex items-center justify-center bg-blue-50/60 dark:bg-slate-800/50"><FileText className="h-8 w-8 text-blue-500" /></div>}
                  <div className="p-2">
                    <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-500">{label(a.kind)}</p>
                  </div>
                </a>
                {!readOnly && (
                  <button
                    type="button" aria-label="Delete attachment" disabled={remove.isPending}
                    onClick={() => { if (window.confirm('Delete this attachment?')) remove.mutate(a.id); }}
                    className="absolute top-1 right-1 rounded-lg bg-white/90 dark:bg-slate-900/90 p-1 text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ItemDetailDialog({ itemId, onClose }) {
  const [tab, setTab] = useState('overview');
  const [dlg, setDlg] = useState(null); // { name, log? }
  const { data: item, isLoading, error } = useQuery({
    queryKey: ['inventory-detail', itemId],
    queryFn: async () => (await api.get(`/tenant/inventory/${itemId}`)).data.data,
    enabled: !!itemId,
  });

  const open = (name, log) => setDlg({ name, log });
  const closeDlg = (name) => (v) => { if (!v && dlg?.name === name) setDlg(null); };
  const is = (name) => dlg?.name === name;

  const v = item?.valuation;
  const disposed = item?.status === 'DISPOSED';
  const lost = item?.status === 'LOST';
  const repairing = item?.status === 'UNDER_REPAIR';
  const logs = item?.serviceLogs || [];

  return (
    <>
      <Dialog open={!!itemId} onOpenChange={(o) => { if (!o) { setTab('overview'); onClose(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Inventory Item Details</DialogTitle></DialogHeader>
          {isLoading ? <div className="py-8 text-center text-slate-400">Loading details...</div>
            : error ? <ErrorText error={error} />
            : item ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-slate-800 dark:text-white">{item.name}</span>
                  <CodeChip>{item.uniqueCode}</CodeChip>
                  <StatusBadge status={item.status} />
                  <StatusBadge status={item.condition} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {disposed ? (
                    <Button size="sm" onClick={() => open('restore')}><RotateCcw className="h-4 w-4" /> Restore</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => open('edit')}><Pencil className="h-4 w-4" /> Edit</Button>
                      {!lost && <Button size="sm" variant="outline" onClick={() => open('transfer')}><ArrowRightLeft className="h-4 w-4" /> Transfer</Button>}
                      {item.assignedResident
                        ? <Button size="sm" variant="outline" onClick={() => open('unassign')}><UserMinus className="h-4 w-4" /> Return</Button>
                        : !lost && !repairing && <Button size="sm" variant="outline" onClick={() => open('assign')}><UserPlus className="h-4 w-4" /> Assign</Button>}
                      {!repairing && <Button size="sm" variant="outline" onClick={() => open('status')}><Activity className="h-4 w-4" /> Status</Button>}
                      {!lost && <Button size="sm" variant="outline" onClick={() => open('service')}><Wrench className="h-4 w-4" /> Service</Button>}
                      <Button size="sm" variant="outline" onClick={() => open('qr')}><QrCode className="h-4 w-4" /> QR</Button>
                      <Button size="sm" variant="outline" onClick={() => open('dispose')}><Archive className="h-4 w-4" /> Dispose</Button>
                      <Button size="sm" variant="outline" onClick={() => open('delete')}><Trash2 className="h-4 w-4 text-red-500" /> Delete</Button>
                    </>
                  )}
                </div>

                <TabBar
                  tabs={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'service', label: 'Service', count: logs.filter((l) => l.status === 'OPEN').length },
                    { value: 'history', label: 'History' },
                    { value: 'files', label: 'Files', count: item.attachments?.length || 0 },
                  ]}
                  value={tab} onChange={setTab}
                />

                {tab === 'overview' && (
                  <div className="space-y-5">
                    <div>
                      <SectionTitle>Item Info</SectionTitle>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        <DetailField label="Category" value={item.category} />
                        <DetailField label="Brand" value={item.brand} />
                        <DetailField label="Model" value={item.model} />
                        <DetailField label="Serial Number" value={item.serialNumber} />
                        <DetailField label="Vendor" value={item.vendor} />
                        <DetailField label="Invoice Number" value={item.invoiceNumber} />
                      </div>
                    </div>
                    <div>
                      <SectionTitle>Location & Assignment</SectionTitle>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        <DetailField label="Building" value={item.building?.name} />
                        <DetailField label="Room" value={item.room ? roomLabel(item.room) : 'Storage'} />
                        <DetailField label="Assigned To" value={personName(item.assignedResident)} />
                      </div>
                    </div>
                    <div>
                      <SectionTitle>Valuation</SectionTitle>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        <DetailField label="Purchase Date" value={formatDate(item.purchaseDate)} />
                        <DetailField label="Purchase Price" value={item.purchasePrice != null ? formatCurrency(item.purchasePrice) : null} />
                        <DetailField label="Salvage Value" value={item.salvageValue != null ? formatCurrency(item.salvageValue) : null} />
                        <DetailField label="Useful Life" value={item.usefulLifeYears ? `${item.usefulLifeYears} years` : null} />
                        <DetailField label="Current Value" value={v?.currentValue != null ? formatCurrency(v.currentValue) : null} />
                        <DetailField label="Depreciation" value={v?.accumulatedDepreciation ? formatCurrency(v.accumulatedDepreciation) : null} />
                      </div>
                    </div>
                    <div>
                      <SectionTitle>Warranty & Service</SectionTitle>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        <DetailField label="Warranty Until" value={formatDate(item.warrantyUntil)} />
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Warranty Status</span>
                          <div className="mt-0.5">
                            {v?.warrantyStatus && v.warrantyStatus !== 'NONE'
                              ? <StatusBadge status={v.warrantyStatus} /> : <span className="text-sm">-</span>}
                            {v?.daysToWarrantyExpiry != null && v.daysToWarrantyExpiry >= 0 && (
                              <span className="ml-2 text-xs text-slate-500">{v.daysToWarrantyExpiry}d left</span>
                            )}
                          </div>
                        </div>
                        <DetailField label="Next Service" value={formatDate(item.nextServiceDate)} />
                        <DetailField label="Last Service" value={formatDate(item.lastServiceDate)} />
                        {v?.serviceDue && <div><span className="text-xs text-slate-500">Service</span><div className="mt-0.5"><StatusBadge status="OVERDUE" /></div></div>}
                      </div>
                    </div>
                    {disposed && (
                      <div>
                        <SectionTitle>Disposal</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                          <DetailField label="Disposed On" value={formatDate(item.disposedAt)} />
                          <DetailField label="Reason" value={item.disposalReason} />
                          <DetailField label="Disposal Value" value={item.disposalValue != null ? formatCurrency(item.disposalValue) : null} />
                        </div>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <SectionTitle>Notes</SectionTitle>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'service' && (
                  <div className="space-y-2">
                    {!logs.length ? <p className="py-6 text-center text-slate-400">No service logs</p>
                      : logs.map((l) => <ServiceLogCard key={l.id} log={l} onComplete={(log) => open('complete', log)} onCancel={(log) => open('cancel', log)} />)}
                  </div>
                )}
                {tab === 'history' && <HistoryTab itemId={item.id} />}
                {tab === 'files' && <FilesTab item={item} readOnly={disposed} />}
              </div>
            ) : null}
        </DialogContent>
      </Dialog>

      {item && (
        <>
          <ItemFormDialog open={is('edit')} onOpenChange={closeDlg('edit')} item={item} />
          <TransferDialog open={is('transfer')} onOpenChange={closeDlg('transfer')} itemIds={[item.id]} currentBuildingId={item.buildingId} />
          <AssignDialog open={is('assign')} onOpenChange={closeDlg('assign')} item={item} />
          <UnassignDialog open={is('unassign')} onOpenChange={closeDlg('unassign')} item={item} />
          <StatusDialog open={is('status')} onOpenChange={closeDlg('status')} item={item} />
          <DisposeDialog open={is('dispose')} onOpenChange={closeDlg('dispose')} item={item} />
          <DeleteDialog open={is('delete')} onOpenChange={closeDlg('delete')} item={item} onDone={onClose} />
          <RestoreDialog open={is('restore')} onOpenChange={closeDlg('restore')} item={item} />
          <OpenServiceDialog open={is('service')} onOpenChange={closeDlg('service')} item={item} />
          <QrDialog open={is('qr')} onOpenChange={closeDlg('qr')} item={item} />
          <CompleteServiceDialog open={is('complete')} onOpenChange={closeDlg('complete')} log={dlg?.log} />
          <CancelServiceDialog open={is('cancel')} onOpenChange={closeDlg('cancel')} log={dlg?.log} />
        </>
      )}
    </>
  );
}
