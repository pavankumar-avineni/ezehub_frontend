import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { ErrorText } from '@/components/inventory/common';

function Node({ node, depth, onOpen }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = node.directReports || [];
  return (
    <li>
      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-blue-50/60 dark:hover:bg-blue-900/20">
        <button type="button" className="h-5 w-5 text-slate-500" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'} disabled={kids.length === 0}>
          {kids.length === 0 ? null : open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(node.id)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
            {(node.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{node.name} <span className="font-normal text-slate-500">({node.employeeCode})</span></span>
            <span className="block truncate text-xs text-slate-500">{[node.designation, node.department].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
        {node.role && <span className="hidden rounded-lg bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-600 sm:inline">{node.role.name || node.role}</span>}
        <StatusBadge status={node.employeeStatus} />
        {kids.length > 0 && <span className="text-xs text-slate-400">{kids.length}</span>}
      </div>
      {open && kids.length > 0 && (
        <ul className="ml-5 border-l border-blue-200/60 dark:border-blue-800/40 pl-3">
          {kids.map((k) => <Node key={k.id} node={k} depth={depth + 1} onOpen={onOpen} />)}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['org-chart'],
    queryFn: async () => (await api.get('/platform/employees/org-chart')).data.data,
  });
  return (
    <div>
      <PageHeader title="Org Chart" description="Reporting lines. Exited employees are not shown." />
      <ErrorText error={error} />
      <div className="glass-card p-4">
        {isLoading ? <p className="py-8 text-center text-slate-400">Loading...</p>
          : !data?.length ? <p className="py-8 text-center text-slate-400">No employees yet</p>
          : <ul className="space-y-1">{data.map((n) => <Node key={n.id} node={n} depth={0} onOpen={(id) => navigate(`/employees/${id}`)} />)}</ul>}
      </div>
    </div>
  );
}
