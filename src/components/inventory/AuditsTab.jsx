import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Plus, ScanLine } from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import {
  CodeChip, DetailField, ErrorText, Field, NativeSelect, Pagination, SectionTitle, TabBar, textareaClass,
  useBuildings, useRooms, useInvalidateInventory, formatDateTime, label, roomLabel,
} from './common';

function StartAuditDialog({ open, onOpenChange, defaultBuildingId, onStarted }) {
  const [form, setForm] = useState({ buildingId: '', roomId: '', title: '', notes: '' });
  const { data: buildings } = useBuildings();
  const { data: rooms } = useRooms(form.buildingId, open && !!form.buildingId);
  const invalidate = useInvalidateInventory();

  useEffect(() => {
    if (open) setForm({ buildingId: defaultBuildingId || '', roomId: '', title: '', notes: '' });
  }, [open, defaultBuildingId]);

  const mutation = useMutation({
    mutationFn: (p) => api.post('/tenant/inventory/audits', p),
    onSuccess: (res) => { invalidate(); onOpenChange(false); onStarted(res.data.data.id); },
  });

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({
      buildingId: form.buildingId,
      ...(form.roomId && { roomId: form.roomId }),
      ...(form.title.trim() && { title: form.title.trim() }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) mutation.reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Stock-Take Audit</DialogTitle>
          <DialogDescription>Snapshots all live items at the location. Items not scanned by the end are marked missing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Building *">
            <NativeSelect value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value, roomId: '' })} required>
              <option value="">Select building</option>
              {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Room (optional, whole building if empty)">
            <NativeSelect value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} disabled={!form.buildingId}>
              <option value="">Entire building</option>
              {(rooms || []).map((r) => <option key={r.id} value={r.id}>{roomLabel(r)}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Auto-generated if empty" /></Field>
          <Field label="Notes"><textarea className={textareaClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <ErrorText error={mutation.error} />
          <DialogFooter><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Starting...' : 'Start Audit'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgressBar({ progress }) {
  const total = (progress?.expected || 0) + (progress?.UNEXPECTED || 0);
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
        <div className="bg-emerald-500" style={{ width: `${pct(progress?.FOUND || 0)}%` }} />
        <div className="bg-violet-500" style={{ width: `${pct(progress?.UNEXPECTED || 0)}%` }} />
        <div className="bg-red-500" style={{ width: `${pct(progress?.MISSING || 0)}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span>Expected: <b>{progress?.expected ?? 0}</b></span>
        <span className="text-emerald-600">Found: <b>{progress?.FOUND ?? 0}</b></span>
        <span>Pending: <b>{progress?.PENDING ?? 0}</b></span>
        <span className="text-red-500">Missing: <b>{progress?.MISSING ?? 0}</b></span>
        <span className="text-violet-500">Unexpected: <b>{progress?.UNEXPECTED ?? 0}</b></span>
      </div>
    </div>
  );
}

function AuditDetailDialog({ auditId, onClose }) {
  const invalidate = useInvalidateInventory();
  const [resultFilter, setResultFilter] = useState('');
  const [code, setCode] = useState('');
  const [foundRoomId, setFoundRoomId] = useState('');
  const [scanNotes, setScanNotes] = useState('');
  const [lastScan, setLastScan] = useState(null);
  const [mode, setMode] = useState(null); // 'complete' | 'cancel'
  const [markLost, setMarkLost] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const codeRef = useRef(null);

  const { data: audit, isLoading, error } = useQuery({
    queryKey: ['inventory-audit', auditId, resultFilter],
    queryFn: async () => (await api.get(`/tenant/inventory/audits/${auditId}`, { params: resultFilter ? { result: resultFilter } : {} })).data.data,
    enabled: !!auditId,
  });
  const active = audit?.status === 'IN_PROGRESS';
  const { data: rooms } = useRooms(audit?.buildingId, !!audit && active);

  useEffect(() => { if (!auditId) { setLastScan(null); setMode(null); setResultFilter(''); setCode(''); } }, [auditId]);

  const scan = useMutation({
    mutationFn: (p) => api.post(`/tenant/inventory/audits/${auditId}/scan`, p),
    onSuccess: (res) => {
      setLastScan({ ok: true, ...res.data.data });
      setCode(''); setScanNotes('');
      invalidate();
      codeRef.current?.focus();
    },
    onError: (err) => { setLastScan({ ok: false, error: err }); codeRef.current?.select(); },
  });
  const complete = useMutation({
    mutationFn: (p) => api.post(`/tenant/inventory/audits/${auditId}/complete`, p),
    onSuccess: () => { invalidate(); setMode(null); },
  });
  const cancel = useMutation({
    mutationFn: () => api.post(`/tenant/inventory/audits/${auditId}/cancel`),
    onSuccess: () => { invalidate(); setMode(null); },
  });

  const submitScan = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    scan.mutate({ code: code.trim(), ...(foundRoomId && { foundRoomId }), ...(scanNotes.trim() && { notes: scanNotes.trim() }) });
  };

  const items = audit?.items || [];
  const roomName = (id) => roomLabel((rooms || []).find((r) => r.id === id));

  return (
    <Dialog open={!!auditId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Audit Details</DialogTitle></DialogHeader>
        {isLoading ? <div className="py-8 text-center text-slate-400">Loading audit...</div>
          : error ? <ErrorText error={error} />
          : audit ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-slate-800 dark:text-white">{audit.title}</span>
                <StatusBadge status={audit.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <DetailField label="Started" value={formatDateTime(audit.startedAt)} />
                <DetailField label="Completed" value={audit.completedAt ? formatDateTime(audit.completedAt) : null} />
                <DetailField label="Notes" value={audit.notes} />
              </div>
              <ProgressBar progress={audit.progress} />

              {active && (
                <div>
                  <SectionTitle>Scan Item</SectionTitle>
                  <form onSubmit={submitScan} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <Input
                      ref={codeRef} autoFocus className="sm:col-span-5" value={code} onChange={(e) => setCode(e.target.value)}
                      placeholder="Scan QR or type item code" aria-label="Item code"
                    />
                    <NativeSelect className="sm:col-span-4" value={foundRoomId} onChange={(e) => setFoundRoomId(e.target.value)} aria-label="Found in room">
                      <option value="">Found in expected room</option>
                      {(rooms || []).map((r) => <option key={r.id} value={r.id}>{roomLabel(r)}</option>)}
                    </NativeSelect>
                    <Button type="submit" className="sm:col-span-3" disabled={scan.isPending || !code.trim()}>
                      <ScanLine className="h-4 w-4" /> {scan.isPending ? 'Scanning...' : 'Scan'}
                    </Button>
                  </form>
                  {lastScan && (
                    <div className={`mt-2 rounded-xl px-3 py-2 text-sm ${lastScan.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-600'}`}>
                      {lastScan.ok ? (
                        <>
                          <b>{lastScan.item?.name}</b> ({lastScan.item?.uniqueCode}): {label(lastScan.result)}
                          {lastScan.alreadyScanned && ' · already scanned'}
                          {lastScan.misplaced && ' · found in a different room than expected'}
                          {lastScan.result === 'UNEXPECTED' && ' · not part of this audit'}
                        </>
                      ) : <ErrorText error={lastScan.error} />}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <SectionTitle className="mb-0">Items</SectionTitle>
                  <TabBar
                    tabs={[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'FOUND', label: 'Found' }, { value: 'MISSING', label: 'Missing' }, { value: 'UNEXPECTED', label: 'Unexpected' }]}
                    value={resultFilter} onChange={setResultFilter}
                  />
                </div>
                <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 max-h-72 overflow-y-auto divide-y divide-blue-100/50 dark:divide-blue-900/30">
                  {items.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No items</p> : items.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{r.inventoryItem?.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {r.inventoryItem?.category}
                          {r.foundRoomId && r.expectedRoomId && r.foundRoomId !== r.expectedRoomId && ` · found in ${roomName(r.foundRoomId) || 'another room'}`}
                          {r.scannedAt && ` · scanned ${formatDateTime(r.scannedAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <CodeChip>{r.inventoryItem?.uniqueCode}</CodeChip>
                        <StatusBadge status={r.result} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {active && !mode && (
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setMode('cancel')}>Cancel Audit</Button>
                  <Button onClick={() => setMode('complete')}><ClipboardCheck className="h-4 w-4" /> Complete Audit</Button>
                </DialogFooter>
              )}
              {active && mode === 'complete' && (
                <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 p-4 space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {audit.progress?.PENDING || 0} unscanned items will be marked missing.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={markLost} onChange={(e) => setMarkLost(e.target.checked)} />
                    Also mark missing items as Lost
                  </label>
                  <Input value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} placeholder="Notes (optional)" />
                  <ErrorText error={complete.error} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
                    <Button disabled={complete.isPending} onClick={() => complete.mutate({ markMissingAsLost: markLost, ...(completeNotes.trim() && { notes: completeNotes.trim() }) })}>
                      {complete.isPending ? 'Completing...' : 'Confirm Complete'}
                    </Button>
                  </div>
                </div>
              )}
              {active && mode === 'cancel' && (
                <div className="rounded-xl border border-red-200/60 dark:border-red-800/40 p-4 space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Cancel this audit? Scan results are kept but no items are changed.</p>
                  <ErrorText error={cancel.error} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
                    <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? 'Cancelling...' : 'Cancel Audit'}</Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AuditsTab({ buildingId }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const { data: buildings } = useBuildings();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-audits', buildingId, status, page],
    queryFn: async () => (await api.get('/tenant/inventory/audits', { params: { page, limit: 20, ...(status && { status }), ...(buildingId && { buildingId }) } })).data,
  });
  const audits = data?.data || [];
  const buildingName = (id) => (buildings || []).find((b) => b.id === id)?.name || '-';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NativeSelect className="w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </NativeSelect>
        <Button onClick={() => setStartOpen(true)}><Plus className="h-4 w-4" /> Start Audit</Button>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Building</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : audits.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No audits yet</TableCell></TableRow>
              : audits.map((a) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => setSelectedId(a.id)}>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{a.title}</TableCell>
                  <TableCell>{buildingName(a.buildingId)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell>{formatDate(a.startedAt)}</TableCell>
                  <TableCell>{formatDate(a.completedAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>
      <StartAuditDialog open={startOpen} onOpenChange={setStartOpen} defaultBuildingId={buildingId} onStarted={setSelectedId} />
      <AuditDetailDialog auditId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
