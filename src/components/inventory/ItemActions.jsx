import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CONDITIONS, SERVICE_TYPES, SETTABLE_STATUSES, Field, NativeSelect, ErrorText, textareaClass, cleanPayload,
  useResidents, useInvalidateInventory, label, personName,
} from './common';

/** Generic wrapper: dialog + form + mutation. */
function ActionDialog({ open, onOpenChange, title, description, submitLabel, pendingLabel, variant, request, buildPayload, onDone, children, canSubmit = true }) {
  const invalidate = useInvalidateInventory();
  const mutation = useMutation({
    mutationFn: (payload) => request(payload),
    onSuccess: (res) => { invalidate(); onOpenChange(false); onDone?.(res); },
  });
  useEffect(() => { if (!open) mutation.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(buildPayload ? buildPayload() : undefined); }} className="space-y-4">
          {children}
          <ErrorText error={mutation.error} />
          <DialogFooter>
            <Button type="submit" variant={variant} disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending ? pendingLabel || 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignDialog({ open, onOpenChange, item }) {
  const [residentId, setResidentId] = useState('');
  const [notes, setNotes] = useState('');
  const { data: residents } = useResidents(open);
  useEffect(() => { if (open) { setResidentId(''); setNotes(''); } }, [open]);

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Assign to Resident" description={item?.name}
      submitLabel="Assign" pendingLabel="Assigning..." canSubmit={!!residentId}
      request={(p) => api.post(`/tenant/inventory/${item.id}/assign`, p)}
      buildPayload={() => ({ residentId, ...(notes.trim() && { notes: notes.trim() }) })}
    >
      <Field label="Resident">
        <NativeSelect value={residentId} onChange={(e) => setResidentId(e.target.value)} required>
          <option value="">Select active resident</option>
          {(residents || []).map((r) => <option key={r.id} value={r.id}>{personName(r)} {r.phone ? `(${r.phone})` : ''}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
    </ActionDialog>
  );
}

export function UnassignDialog({ open, onOpenChange, item }) {
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) { setCondition(''); setNotes(''); } }, [open]);

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Return from Resident"
      description={`${item?.name} is assigned to ${personName(item?.assignedResident)}`}
      submitLabel="Mark Returned" pendingLabel="Saving..."
      request={(p) => api.post(`/tenant/inventory/${item.id}/unassign`, p)}
      buildPayload={() => ({ ...(condition && { condition }), ...(notes.trim() && { notes: notes.trim() }) })}
    >
      <Field label="Condition on return">
        <NativeSelect value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">Unchanged ({item?.condition})</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
    </ActionDialog>
  );
}

export function StatusDialog({ open, onOpenChange, item }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setStatus(''); setReason(''); } }, [open]);

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Change Status"
      description={`${item?.name} is currently ${label(item?.status)}`}
      submitLabel="Update Status" canSubmit={!!status}
      request={(p) => api.post(`/tenant/inventory/${item.id}/status`, p)}
      buildPayload={() => ({ status, ...(reason.trim() && { reason: reason.trim() }) })}
    >
      <Field label="New Status">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} required>
          <option value="">Select status</option>
          {SETTABLE_STATUSES.filter((s) => s !== item?.status).map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </NativeSelect>
      </Field>
      {status === 'LOST' && <p className="text-xs text-amber-600 dark:text-amber-400">Marking an item lost also removes its resident assignment.</p>}
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" /></Field>
    </ActionDialog>
  );
}

export function DisposeDialog({ open, onOpenChange, item }) {
  const [reason, setReason] = useState('');
  const [value, setValue] = useState('');
  useEffect(() => { if (open) { setReason(''); setValue(''); } }, [open]);

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Dispose Item" variant="destructive"
      description={`${item?.name} will be retired but kept in records. Open repairs are cancelled. You can restore it later.`}
      submitLabel="Dispose" pendingLabel="Disposing..." canSubmit={!!reason.trim()}
      request={(p) => api.post(`/tenant/inventory/${item.id}/dispose`, p)}
      buildPayload={() => ({ reason: reason.trim(), ...(value !== '' && { disposalValue: Number(value) }) })}
    >
      <Field label="Reason *"><Input value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
      <Field label="Disposal / Scrap Value (₹)"><Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
    </ActionDialog>
  );
}

export function DeleteDialog({ open, onOpenChange, item, onDone }) {
  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Delete Item" variant="destructive"
      description="Use this only for items entered in error. The code is freed for reuse and open repairs are cancelled. Use Dispose to retire a real asset."
      submitLabel="Delete" pendingLabel="Deleting..."
      request={() => api.delete(`/tenant/inventory/${item.id}`)} onDone={onDone}
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">Delete <strong>{item?.name}</strong> ({item?.uniqueCode})?</p>
    </ActionDialog>
  );
}

export function OpenServiceDialog({ open, onOpenChange, item }) {
  const [form, setForm] = useState({ type: 'REPAIR', description: '', vendor: '', cost: '', nextServiceDate: '' });
  useEffect(() => { if (open) setForm({ type: 'REPAIR', description: '', vendor: '', cost: '', nextServiceDate: '' }); }, [open]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Open Service Log" description={item?.name}
      submitLabel="Open Log" canSubmit={!!form.description.trim()}
      request={(p) => api.post(`/tenant/inventory/${item.id}/service-logs`, p)}
      buildPayload={() => cleanPayload(form, { numberFields: ['cost'] })}
    >
      <Field label="Type">
        <NativeSelect value={form.type} onChange={set('type')}>
          {SERVICE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </NativeSelect>
      </Field>
      {form.type === 'REPAIR' && <p className="text-xs text-amber-600 dark:text-amber-400">A repair sets the item to Under Repair until completed or cancelled.</p>}
      <Field label="Description *"><textarea className={textareaClass} rows={3} value={form.description} onChange={set('description')} required /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Vendor"><Input value={form.vendor} onChange={set('vendor')} /></Field>
        <Field label="Estimated Cost (₹)"><Input type="number" min="0" value={form.cost} onChange={set('cost')} /></Field>
      </div>
      <Field label="Next Service Date"><Input type="date" value={form.nextServiceDate} onChange={set('nextServiceDate')} /></Field>
    </ActionDialog>
  );
}

export function CompleteServiceDialog({ open, onOpenChange, log }) {
  const [form, setForm] = useState({ resolution: '', cost: '', nextServiceDate: '', condition: '' });
  const [recordExpense, setRecordExpense] = useState(true);
  useEffect(() => {
    if (open) { setForm({ resolution: '', cost: log?.cost ?? '', nextServiceDate: '', condition: '' }); setRecordExpense(true); }
  }, [open, log]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Complete Service Log"
      description={log ? `${label(log.type)}: ${log.description}` : ''}
      submitLabel="Complete" pendingLabel="Completing..."
      request={(p) => api.post(`/tenant/inventory/service-logs/${log.id}/complete`, p)}
      buildPayload={() => ({ ...cleanPayload(form, { numberFields: ['cost'] }), recordExpense })}
    >
      <Field label="Resolution"><textarea className={textareaClass} rows={2} value={form.resolution} onChange={set('resolution')} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Final Cost (₹)"><Input type="number" min="0" value={form.cost} onChange={set('cost')} /></Field>
        <Field label="Condition After">
          <NativeSelect value={form.condition} onChange={set('condition')}>
            <option value="">Unchanged</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Next Service Date"><Input type="date" value={form.nextServiceDate} onChange={set('nextServiceDate')} /></Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={recordExpense} onChange={(e) => setRecordExpense(e.target.checked)} />
        Book the cost as a Maintenance expense
      </label>
    </ActionDialog>
  );
}

export function CancelServiceDialog({ open, onOpenChange, log }) {
  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Cancel Service Log" variant="destructive"
      description="The item returns to its previous status if this is its only open repair."
      submitLabel="Cancel Log" pendingLabel="Cancelling..."
      request={() => api.post(`/tenant/inventory/service-logs/${log.id}/cancel`)}
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">{log ? `${label(log.type)}: ${log.description}` : ''}</p>
    </ActionDialog>
  );
}

export function QrDialog({ open, onOpenChange, item }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-qr', item?.id, item?.uniqueCode],
    queryFn: async () => (await api.get(`/tenant/inventory/${item.id}/qr`, { params: { format: 'json', size: 400 } })).data.data,
    enabled: open && !!item,
  });

  const print = () => {
    if (!data?.dataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=520');
    if (!w) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<html><body style="font-family:sans-serif;text-align:center;margin:24px"><img src="${data.dataUrl}" width="300" height="300"/><h3 style="margin:8px 0 0">${esc(data.name)}</h3><p style="margin:4px 0;font-size:18px;font-weight:bold">${esc(data.code)}</p></body></html>`);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = data.dataUrl;
    a.download = `${data.code}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code</DialogTitle><DialogDescription>{item?.name}</DialogDescription></DialogHeader>
        <div className="flex flex-col items-center gap-2 py-2">
          {isLoading ? <p className="py-12 text-slate-400">Loading...</p>
            : error ? <ErrorText error={error} />
            : data ? (
              <>
                <img src={data.dataUrl} alt={`QR for ${data.code}`} className="h-56 w-56 rounded-xl bg-white p-2" />
                <p className="font-semibold text-blue-700 dark:text-blue-300">{data.code}</p>
              </>
            ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={download} disabled={!data}><Download className="h-4 w-4" /> Download</Button>
          <Button onClick={print} disabled={!data}><Printer className="h-4 w-4" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestoreDialog({ open, onOpenChange, item, onDone }) {
  return (
    <ActionDialog
      open={open} onOpenChange={onOpenChange} title="Restore Item"
      description="A disposed item returns to the register as Fair condition. A deleted item gets its original code back."
      submitLabel="Restore" pendingLabel="Restoring..."
      request={() => api.post(`/tenant/inventory/${item.id}/restore`)} onDone={onDone}
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">Restore <strong>{item?.name}</strong>?</p>
    </ActionDialog>
  );
}
