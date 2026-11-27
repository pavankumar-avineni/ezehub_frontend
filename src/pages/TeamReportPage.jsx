import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserX } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorText, Field } from '@/components/inventory/common';
import { formatINR } from '@/lib/features';
import { formatDate } from '@/lib/utils';

const dayInput = (d) => d.toISOString().slice(0, 10);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const COLUMNS = [
  ['tenantsCreatedInPeriod', 'Created (period)'], ['tenantsCreatedTotal', 'Created (total)'], ['tenantsManaged', 'Maintained'],
  ['activeTenantsManaged', 'Active'], ['trialTenantsManaged', 'On trial'], ['billableBedsManaged', 'Beds'],
  ['estimatedMonthlyRecurring', 'Est. monthly', true], ['trialPipeline', 'Trial pipeline', true],
  ['revenueCollectedFromManagedTenants', 'Revenue collected', true], ['invoicesGenerated', 'Invoices'],
  ['paymentsConfirmed', 'Payments confirmed'], ['paymentsConfirmedAmount', 'Confirmed amount', true],
];

export default function TeamReportPage() {
  const [range, setRange] = useState(() => ({ from: dayInput(new Date(Date.now() - 30 * 86400000)), to: dayInput(new Date()) }));

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-report', range],
    queryFn: async () => (await api.get('/platform/reports/team', {
      params: { from: new Date(`${range.from}T00:00:00`).toISOString(), to: new Date(`${range.to}T23:59:59.999`).toISOString() },
    })).data.data,
    enabled: !!range.from && !!range.to,
  });
  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const cell = (row, [key, , money]) => (money ? formatINR(row[key]) : num(row[key]));

  return (
    <div>
      <PageHeader title="Team Report" description="Performance and workload per employee" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="To"><Input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
        {data?.period && <p className="pb-2 text-xs text-slate-500">Showing {formatDate(data.period.from)} to {formatDate(data.period.to)}</p>}
      </div>
      <ErrorText error={error} />

      {totals.unassignedTenants != null && (
        <div className="mb-4 glass-card flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <UserX className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{num(totals.unassignedTenants)} unassigned tenant{num(totals.unassignedTenants) === 1 ? '' : 's'}</p>
              <p className="text-xs text-slate-500">No account manager is maintaining these</p>
            </div>
          </div>
          <Link to="/tenants?unassigned=true" className="text-sm font-semibold text-blue-600 hover:underline">View tenants</Link>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              {COLUMNS.map(([k, label]) => <TableHead key={k} className="text-right whitespace-nowrap">{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-slate-400">No data for this period</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.employee.id}>
                  <TableCell className="min-w-[14rem]">
                    <Link to={`/employees/${r.employee.id}`} className="font-semibold text-blue-600 hover:underline">{r.employee.name}</Link>
                    <p className="text-xs text-slate-500">{r.employee.employeeCode} · {r.employee.role?.name || r.employee.role || r.employee.designation}</p>
                    {r.employee.employeeStatus !== 'ACTIVE' && <StatusBadge status={r.employee.employeeStatus} />}
                  </TableCell>
                  {COLUMNS.map((c) => <TableCell key={c[0]} className="text-right whitespace-nowrap">{cell(r, c)}</TableCell>)}
                </TableRow>
              ))}
            {rows.length > 0 && (
              <TableRow className="bg-blue-50/50 dark:bg-slate-800/40 font-semibold">
                <TableCell>Total</TableCell>
                {COLUMNS.map((c) => <TableCell key={c[0]} className="text-right whitespace-nowrap">{cell(totals, c)}</TableCell>)}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
