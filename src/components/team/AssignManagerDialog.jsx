import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field } from '@/components/inventory/common';
import { EmployeeSelect } from '@/components/team/common';
import { fieldErrors } from '@/lib/errors';

/**
 * Change the account manager of one tenant, or of many (bulk). Choose "Unassigned" to clear it.
 * Only active employees are offered.
 */
export default function AssignManagerDialog({ open, onOpenChange, tenantIds = [], currentManagerId, tenantName, onDone }) {
  const bulk = tenantIds.length > 1;
  const queryClient = useQueryClient();
  const [managerId, setManagerId] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { if (open) { setManagerId(''); setReason(''); setResult(null); } }, [open]);

  const m = useMutation({
    mutationFn: (body) => (bulk
      ? api.post('/platform/tenants/bulk-assign', { tenantIds, ...body })
      : api.put(`/platform/tenants/${tenantIds[0]}/account-manager`, body)),
    onSuccess: (res) => {
      ['tenants', 'platform-tenant', 'assignment-history', 'employee-tenants', 'team-report', 'employee'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (bulk) setResult(res.data.data); else onOpenChange(false);
      onDone?.(res.data.data);
    },
  });
  const errs = fieldErrors(m.error);
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    m.mutate({ accountManagerId: managerId || null, ...(reason.trim() && { reason: reason.trim() }) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bulk ? `Assign ${tenantIds.length} tenants` : 'Change account manager'}</DialogTitle>
          <DialogDescription>{bulk ? 'The selected employee will maintain all selected tenants.' : tenantName}</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600">{result.changed} changed, {result.unchanged} already assigned (of {result.requested}).</p>
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Account manager" error={errs.accountManagerId}>
              <EmployeeSelect value={managerId} onChange={setManagerId} excludeIds={bulk || !currentManagerId ? [] : [currentManagerId]} emptyLabel="Unassigned (no account manager)" />
            </Field>
            <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
            <DialogFooter>
              <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Saving...' : managerId ? 'Assign' : 'Mark unassigned'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
