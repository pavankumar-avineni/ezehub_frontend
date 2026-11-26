import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, NativeSelect, ErrorText, useBuildings, useRooms, useInvalidateInventory, roomLabel } from './common';

/** Single transfer when one id is passed, bulk transfer otherwise. */
export default function TransferDialog({ open, onOpenChange, itemIds = [], currentBuildingId, onDone }) {
  const [buildingId, setBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [reason, setReason] = useState('');
  const invalidate = useInvalidateInventory();
  const { data: buildings } = useBuildings();
  const { data: rooms } = useRooms(buildingId, open && !!buildingId);
  const single = itemIds.length === 1;

  useEffect(() => {
    if (open) { setBuildingId(currentBuildingId || ''); setRoomId(''); setReason(''); }
  }, [open, currentBuildingId]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      single ? api.post(`/tenant/inventory/${itemIds[0]}/transfer`, payload) : api.post('/tenant/inventory/bulk-transfer', { itemIds, ...payload }),
    onSuccess: () => { invalidate(); onOpenChange(false); onDone?.(); },
  });

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({
      toBuildingId: buildingId || undefined,
      toRoomId: roomId || null,
      ...(reason.trim() && { reason: reason.trim() }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) mutation.reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{single ? 'Transfer Item' : `Transfer ${itemIds.length} Items`}</DialogTitle>
          <DialogDescription>Move to another room or building. Choose no room to send to storage.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Destination Building">
            <NativeSelect value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setRoomId(''); }} required>
              <option value="">Select building</option>
              {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Destination Room">
            <NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!buildingId}>
              <option value="">Storage (no room)</option>
              {(rooms || []).map((r) => <option key={r.id} value={r.id}>{roomLabel(r)}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" /></Field>
          <ErrorText error={mutation.error} />
          <DialogFooter><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Transferring...' : 'Transfer'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
