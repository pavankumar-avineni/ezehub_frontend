import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CONDITIONS, Field, NativeSelect, ErrorText, SectionTitle, textareaClass, cleanPayload, toDateInput,
  useBuildings, useRooms, useInventoryCategories, useInvalidateInventory, roomLabel,
} from './common';

const EMPTY = {
  buildingId: '', roomId: '', status: '', name: '', category: '', uniqueCode: '', serialNumber: '', brand: '', model: '',
  vendor: '', invoiceNumber: '', purchaseDate: '', purchasePrice: '', salvageValue: '', usefulLifeYears: '',
  warrantyUntil: '', nextServiceDate: '', condition: 'NEW', notes: '',
};

export const NUMBER_FIELDS = ['purchasePrice', 'salvageValue'];
export const INT_FIELDS = ['usefulLifeYears'];

function fromItem(item) {
  return {
    ...EMPTY,
    name: item.name || '', category: item.category || '', uniqueCode: item.uniqueCode || '',
    serialNumber: item.serialNumber || '', brand: item.brand || '', model: item.model || '', vendor: item.vendor || '',
    invoiceNumber: item.invoiceNumber || '', purchaseDate: toDateInput(item.purchaseDate),
    purchasePrice: item.purchasePrice ?? '', salvageValue: item.salvageValue ?? '', usefulLifeYears: item.usefulLifeYears ?? '',
    warrantyUntil: toDateInput(item.warrantyUntil), nextServiceDate: toDateInput(item.nextServiceDate),
    condition: item.condition === 'DISPOSED' ? 'FAIR' : item.condition || 'NEW', notes: item.notes || '',
  };
}

/** Shared by create and edit. Pass `item` to edit. */
export function ItemFormFields({ form, setForm, isEdit }) {
  const { data: buildings } = useBuildings();
  const { data: rooms } = useRooms(form.buildingId, !isEdit && !!form.buildingId);
  const { data: categories } = useInventoryCategories();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      {!isEdit && (
        <div>
          <SectionTitle>Location</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Building *">
              <NativeSelect value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value, roomId: '' })} required>
                <option value="">Select building</option>
                {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Room (optional)">
              <NativeSelect value={form.roomId} onChange={set('roomId')} disabled={!form.buildingId}>
                <option value="">Storage (no room)</option>
                {(rooms || []).map((r) => <option key={r.id} value={r.id}>{roomLabel(r)}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Initial Status">
              <NativeSelect value={form.status} onChange={set('status')}>
                <option value="">Auto (by room)</option>
                <option value="IN_USE">In Use</option>
                <option value="IN_STORAGE">In Storage</option>
              </NativeSelect>
            </Field>
          </div>
        </div>
      )}

      <div>
        <SectionTitle>Item Info</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name *"><Input value={form.name} onChange={set('name')} required /></Field>
          <Field label="Category *">
            <Input list="inventory-category-options" value={form.category} onChange={set('category')} placeholder="e.g. Bed, Fan, AC" required />
            <datalist id="inventory-category-options">
              {(categories || []).map((c) => <option key={c.name} value={c.name} />)}
            </datalist>
          </Field>
          <Field label="Unique Code">
            <Input value={form.uniqueCode} onChange={set('uniqueCode')} placeholder={isEdit ? '' : 'Auto-generated if empty'} />
          </Field>
          <Field label="Condition">
            <NativeSelect value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Brand"><Input value={form.brand} onChange={set('brand')} /></Field>
          <Field label="Model"><Input value={form.model} onChange={set('model')} /></Field>
          <Field label="Serial Number"><Input value={form.serialNumber} onChange={set('serialNumber')} /></Field>
        </div>
      </div>

      <div>
        <SectionTitle>Purchase & Valuation</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Vendor"><Input value={form.vendor} onChange={set('vendor')} /></Field>
          <Field label="Invoice Number"><Input value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
          <Field label="Purchase Date"><Input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></Field>
          <Field label="Purchase Price (₹)"><Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} /></Field>
          <Field label="Salvage Value (₹)"><Input type="number" min="0" step="0.01" value={form.salvageValue} onChange={set('salvageValue')} /></Field>
          <Field label="Useful Life (years)"><Input type="number" min="1" step="1" value={form.usefulLifeYears} onChange={set('usefulLifeYears')} placeholder="Enables depreciation" /></Field>
        </div>
      </div>

      <div>
        <SectionTitle>Warranty & Service</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Warranty Until"><Input type="date" value={form.warrantyUntil} onChange={set('warrantyUntil')} /></Field>
          <Field label="Next Service Date"><Input type="date" value={form.nextServiceDate} onChange={set('nextServiceDate')} /></Field>
        </div>
      </div>

      <Field label="Notes">
        <textarea className={textareaClass} rows={3} value={form.notes} onChange={set('notes')} />
      </Field>
    </div>
  );
}

export default function ItemFormDialog({ open, onOpenChange, item, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(EMPTY);
  const invalidate = useInvalidateInventory();

  useEffect(() => {
    if (open) setForm(item ? fromItem(item) : EMPTY);
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.put(`/tenant/inventory/${item.id}`, payload) : api.post('/tenant/inventory', payload)),
    onSuccess: (res) => {
      invalidate();
      onOpenChange(false);
      onSaved?.(res.data.data);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const payload = cleanPayload(form, { numberFields: NUMBER_FIELDS, intFields: INT_FIELDS });
    if (isEdit) {
      delete payload.buildingId; delete payload.roomId; delete payload.status;
      if (payload.uniqueCode === item.uniqueCode) delete payload.uniqueCode;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) mutation.reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? `Edit ${item.name}` : 'Add Inventory Item'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ItemFormFields form={form} setForm={setForm} isEdit={isEdit} />
          {isEdit && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Location, status and assignment are changed with the Transfer, Status and Assign actions.
            </p>
          )}
          <ErrorText error={mutation.error} />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
