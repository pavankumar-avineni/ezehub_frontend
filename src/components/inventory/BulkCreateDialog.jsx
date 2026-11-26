import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CONDITIONS, Field, NativeSelect, ErrorText, TabBar, cleanPayload, useBuildings, useRooms,
  useInventoryCategories, useInvalidateInventory, roomLabel,
} from './common';
import { ItemFormFields, NUMBER_FIELDS, INT_FIELDS } from './ItemFormDialog';

const TEMPLATE = {
  buildingId: '', roomId: '', status: '', name: '', category: '', uniqueCode: '', serialNumber: '', brand: '', model: '',
  vendor: '', invoiceNumber: '', purchaseDate: '', purchasePrice: '', salvageValue: '', usefulLifeYears: '',
  warrantyUntil: '', nextServiceDate: '', condition: 'NEW', notes: '',
};
const newRow = () => ({ name: '', category: '', uniqueCode: '', purchasePrice: '', condition: 'NEW' });

export default function BulkCreateDialog({ open, onOpenChange }) {
  const [mode, setMode] = useState('template');
  const [template, setTemplate] = useState(TEMPLATE);
  const [quantity, setQuantity] = useState(2);
  const [shared, setShared] = useState({ buildingId: '', roomId: '' });
  const [rows, setRows] = useState([newRow(), newRow()]);
  const [result, setResult] = useState(null);
  const invalidate = useInvalidateInventory();
  const { data: buildings } = useBuildings();
  const { data: rooms } = useRooms(shared.buildingId, mode === 'rows' && !!shared.buildingId);
  const { data: categories } = useInventoryCategories();

  useEffect(() => {
    if (open) { setResult(null); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/inventory/bulk', payload),
    onSuccess: (res) => {
      invalidate();
      setResult(res.data.data);
      setTemplate(TEMPLATE);
      setRows([newRow(), newRow()]);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'template') {
      const t = cleanPayload(template, { numberFields: NUMBER_FIELDS, intFields: INT_FIELDS });
      if (Number(quantity) > 1) delete t.uniqueCode;
      mutation.mutate({ template: t, quantity: Number(quantity) });
    } else {
      const items = rows.map((r) => ({
        ...cleanPayload({ ...r, buildingId: shared.buildingId, roomId: shared.roomId }, { numberFields: ['purchasePrice'] }),
      }));
      mutation.mutate({ items });
    }
  };

  const updateRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const close = (v) => { if (!v) mutation.reset(); onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Add Inventory</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{result.count} items created.</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-blue-100/60 dark:border-blue-900/30 divide-y divide-blue-100/50 dark:divide-blue-900/30">
              {(result.items || []).map((i) => (
                <div key={i.id} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-slate-800 dark:text-white">{i.name}</span>
                  <span className="text-blue-700 dark:text-blue-300 font-semibold">{i.uniqueCode}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>Add More</Button>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <TabBar
              tabs={[{ value: 'template', label: 'Same item × quantity' }, { value: 'rows', label: 'Different items' }]}
              value={mode}
              onChange={setMode}
            />
            {mode === 'template' ? (
              <>
                <Field label="Quantity (max 200)">
                  <Input type="number" min="1" max="200" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="max-w-[10rem]" />
                </Field>
                <ItemFormFields form={template} setForm={setTemplate} />
                <p className="text-xs text-slate-500 dark:text-slate-400">Codes are generated automatically when quantity is more than 1.</p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Building *">
                    <NativeSelect value={shared.buildingId} onChange={(e) => setShared({ buildingId: e.target.value, roomId: '' })} required>
                      <option value="">Select building</option>
                      {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Room (optional)">
                    <NativeSelect value={shared.roomId} onChange={(e) => setShared({ ...shared, roomId: e.target.value })} disabled={!shared.buildingId}>
                      <option value="">Storage (no room)</option>
                      {(rooms || []).map((r) => <option key={r.id} value={r.id}>{roomLabel(r)}</option>)}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-3" placeholder="Name *" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} required />
                      <Input className="col-span-2" list="bulk-category-options" placeholder="Category *" value={r.category} onChange={(e) => updateRow(i, { category: e.target.value })} required />
                      <Input className="col-span-2" placeholder="Code (auto)" value={r.uniqueCode} onChange={(e) => updateRow(i, { uniqueCode: e.target.value })} />
                      <Input className="col-span-2" type="number" min="0" placeholder="Price" value={r.purchasePrice} onChange={(e) => updateRow(i, { purchasePrice: e.target.value })} />
                      <NativeSelect className="col-span-2" value={r.condition} onChange={(e) => updateRow(i, { condition: e.target.value })}>
                        {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </NativeSelect>
                      <Button type="button" variant="ghost" size="icon" className="col-span-1" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <datalist id="bulk-category-options">{(categories || []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
                  <Button type="button" variant="outline" size="sm" disabled={rows.length >= 200} onClick={() => setRows([...rows, newRow()])}>
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>
              </>
            )}
            <ErrorText error={mutation.error} />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating...' : 'Create Items'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
