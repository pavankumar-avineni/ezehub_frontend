import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Pencil } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, NativeSelect, Pagination, SectionTitle, formatDateTime, label, textareaClass } from '@/components/inventory/common';
import { groupFeatures, ReadOnlyNote } from '@/components/billing/shared';
import { useIsSuperAdmin } from '@/hooks/useFeature';
import { fieldErrors } from '@/lib/errors';
import { PRICE_TYPE_LABEL, formatINR, isCoreFeature } from '@/lib/features';

function HistoryDialog({ open, onOpenChange }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['feature-history-catalog', page],
    queryFn: async () => (await api.get('/subscription/admin/features/history', { params: { scope: 'catalog', page, limit: 10 } })).data,
    enabled: open,
  });
  const rows = data?.data || [];
  const show = (v) => (v === null || v === undefined ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Catalog History</DialogTitle></DialogHeader>
        {isLoading ? <p className="py-6 text-center text-slate-400">Loading...</p>
          : rows.length === 0 ? <p className="py-6 text-center text-slate-400">No catalog changes yet</p>
          : (
            <div className="space-y-2">
              {rows.map((h) => (
                <div key={h.id} className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><StatusBadge status={h.action} /><span className="text-sm font-semibold">{h.featureCode}</span></div>
                    <span className="text-xs text-slate-500">{formatDateTime(h.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{show(h.oldValue)} → {show(h.newValue)}</p>
                  {h.reason && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Reason: {h.reason}</p>}
                </div>
              ))}
            </div>
          )}
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </DialogContent>
    </Dialog>
  );
}

function EditFeatureDialog({ feature, onClose, canEdit, onSaved }) {
  const core = feature && (feature.isCore || isCoreFeature(feature.code));
  const [form, setForm] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (feature) {
      setForm({
        price: String(feature.price ?? ''), priceType: feature.priceType, name: feature.name || '',
        description: feature.description || '', isActive: feature.isActive !== false, reason: '',
      });
      setConfirmed(false);
    }
  }, [feature]);

  const mutation = useMutation({
    mutationFn: (payload) => api.put(`/subscription/admin/features/${feature.code}`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      queryClient.invalidateQueries({ queryKey: ['feature-history-catalog'] });
      onSaved(res.data.data);
      onClose();
    },
  });
  const errs = fieldErrors(mutation.error);
  if (!feature) return null;

  const changes = {};
  if (form.name !== undefined && form.name !== (feature.name || '')) changes.name = form.name;
  if (form.description !== undefined && form.description !== (feature.description || '')) changes.description = form.description;
  if (!core) {
    if (form.price !== '' && Number(form.price) !== Number(feature.price)) changes.price = Number(form.price);
    if (form.priceType !== feature.priceType) changes.priceType = form.priceType;
    if (form.isActive !== (feature.isActive !== false)) changes.isActive = form.isActive;
  }
  const priceTypeChanged = 'priceType' in changes;
  const hasChanges = Object.keys(changes).length > 0;
  const needConfirm = priceTypeChanged && !confirmed;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={!!feature} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {feature.name}</DialogTitle>
          <DialogDescription>{feature.code}{core ? ' · core feature' : ''}. Changes apply to new invoices only.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (hasChanges && !needConfirm) mutation.mutate({ ...changes, ...(form.reason.trim() && { reason: form.reason.trim() }) }); }}
          className="space-y-4"
        >
          <Field label="Name" error={errs.name}><Input value={form.name || ''} onChange={set('name')} disabled={!canEdit} /></Field>
          <Field label="Description" error={errs.description}><textarea className={textareaClass} rows={2} value={form.description || ''} onChange={set('description')} disabled={!canEdit} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)" error={errs.price}>
              <Input type="number" min="0" max="1000000" step="0.01" value={core ? '0' : form.price || ''} onChange={set('price')} disabled={core || !canEdit} />
            </Field>
            <Field label="Price type" error={errs.priceType}>
              <NativeSelect value={form.priceType || 'PER_BED'} onChange={set('priceType')} disabled={core || !canEdit}>
                <option value="PER_BED">{PRICE_TYPE_LABEL.PER_BED}</option>
                <option value="FLAT">{PRICE_TYPE_LABEL.FLAT}</option>
              </NativeSelect>
            </Field>
          </div>
          {core && <p className="text-xs text-slate-500">Included in the per-bed rate. Only the name and description can change.</p>}
          {!core && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} disabled={!canEdit} />
              Active (inactive add-ons cannot be newly assigned; tenants who have it keep it)
            </label>
          )}
          <Field label="Reason (optional)"><Input value={form.reason || ''} onChange={set('reason')} disabled={!canEdit} /></Field>
          {priceTypeChanged && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/10 p-3 text-sm text-amber-800 dark:text-amber-200 space-y-2">
              <p>Changing the price type clears every tenant's special price for this feature ({feature.tenantsUsing ?? 0} tenants use it).</p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I understand</label>
            </div>
          )}
          <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
          {canEdit && (
            <DialogFooter>
              <Button type="submit" disabled={!hasChanges || needConfirm || mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformFeaturesPage() {
  const canEdit = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const { data: features, isLoading, error } = useQuery({
    queryKey: ['admin-features'],
    queryFn: async () => (await api.get('/subscription/admin/features')).data.data,
  });

  const toggleActive = useMutation({
    mutationFn: ({ code, isActive }) => api.put(`/subscription/admin/features/${code}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-features'] }),
  });

  return (
    <div>
      <PageHeader
        title="Feature Catalog"
        description="Core features are included in the per-bed rate. Add-ons are priced and switched on per tenant."
        actions={<Button variant="outline" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" /> History</Button>}
      />
      <div className="mb-4"><ReadOnlyNote show={!canEdit} /></div>
      {notice && <div className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
      <ErrorText error={error || toggleActive.error} />

      <div className="space-y-6">
        {isLoading && <p className="text-center py-8 text-slate-400">Loading...</p>}
        {groupFeatures(features).map(([group, list]) => (
          <div key={group}>
            <SectionTitle>{group}</SectionTitle>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead><TableHead>Type</TableHead><TableHead>Price</TableHead><TableHead>Active</TableHead><TableHead>Tenants using</TableHead><TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((f) => {
                    const core = f.isCore || isCoreFeature(f.code);
                    return (
                      <TableRow key={f.code}>
                        <TableCell>
                          <p className="font-semibold text-slate-800 dark:text-white">{f.name}</p>
                          <p className="text-xs text-slate-500">{f.code}{(f.requires || []).length > 0 && ` · requires ${f.requires.join(', ')}`}</p>
                        </TableCell>
                        <TableCell><Badge variant={core ? 'secondary' : 'default'}>{core ? 'Core' : 'Add-on'}</Badge></TableCell>
                        <TableCell>
                          {core ? <span className="text-xs text-slate-500">Included in the per-bed rate</span> : (
                            <>
                              <p className="font-medium">{formatINR(f.price)}</p>
                              <p className="text-xs text-slate-500">{PRICE_TYPE_LABEL[f.priceType]}</p>
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {core ? <span className="text-xs text-slate-400">Always on</span> : (
                            <input
                              type="checkbox" aria-label={`Active ${f.name}`} checked={f.isActive !== false}
                              disabled={!canEdit || toggleActive.isPending}
                              onChange={(e) => toggleActive.mutate({ code: f.code, isActive: e.target.checked })}
                            />
                          )}
                        </TableCell>
                        <TableCell>{f.tenantsUsing ?? 0}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" title={canEdit ? 'Edit' : 'View'} onClick={() => { setNotice(''); setEditing(f); }}><Pencil className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      <EditFeatureDialog
        feature={editing} canEdit={canEdit} onClose={() => setEditing(null)}
        onSaved={(res) => {
          if (typeof res?.customPricesCleared === 'number') setNotice(`Saved. ${res.customPricesCleared} special price${res.customPricesCleared === 1 ? '' : 's'} cleared.`);
          else setNotice('Feature saved.');
        }}
      />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
