import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ErrorText, SectionTitle, formatDateTime } from '@/components/inventory/common';
import AssignManagerDialog from '@/components/team/AssignManagerDialog';
import { personLabel } from '@/components/team/common';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';

export function PersonLink({ person, empty = 'Unassigned' }) {
  if (!person) return <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">{empty}</span>;
  return (
    <Link to={`/employees/${person.id}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
      {personLabel(person)}
    </Link>
  );
}

/** Creator + account manager of a tenant, with assignment history. */
export default function OwnerCard({ tenant }) {
  const { can } = useCan();
  const [open, setOpen] = useState(false);
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['assignment-history', tenant.id],
    queryFn: async () => (await api.get(`/platform/tenants/${tenant.id}/assignment-history`)).data.data,
  });

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Ownership</h3>
        {can(PERM.ASSIGN_TENANTS) && <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Change account manager</Button>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <span className="text-xs text-slate-500">Account manager</span>
          <p className="text-sm font-medium"><PersonLink person={tenant.accountManager} /></p>
          {tenant.accountManagerAssignedAt && <p className="text-xs text-slate-500">Since {formatDateTime(tenant.accountManagerAssignedAt)}</p>}
        </div>
        <div>
          <span className="text-xs text-slate-500">Created by</span>
          <p className="text-sm font-medium"><PersonLink person={tenant.createdBy} empty="Self sign-up" /></p>
        </div>
      </div>

      <div>
        <SectionTitle>Assignment history</SectionTitle>
        <ErrorText error={error} />
        {isLoading ? <p className="text-sm text-slate-400">Loading...</p>
          : !history?.length ? <p className="text-sm text-slate-400">No assignment changes yet</p>
          : (
            <ol className="relative ml-2 space-y-3 border-l border-blue-200/60 dark:border-blue-800/40">
              {history.map((h) => (
                <li key={h.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-400" />
                  <p className="text-sm text-slate-800 dark:text-white">
                    {h.from ? personLabel(h.from) : 'Unassigned'} → {h.to ? personLabel(h.to) : 'Unassigned'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(h.createdAt)}{h.assignedBy ? ` · by ${personLabel(h.assignedBy)}` : ''}{h.reason ? ` · ${h.reason}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
      </div>

      <AssignManagerDialog open={open} onOpenChange={setOpen} tenantIds={[tenant.id]} currentManagerId={tenant.accountManager?.id} tenantName={tenant.name} />
    </div>
  );
}
