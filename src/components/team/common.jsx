import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, ShieldOff } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/inventory/common';
import { useCan } from '@/hooks/useFeature';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'EXITED'];
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

const FAILURE_LABELS = {
  WRONG_PASSWORD: 'Wrong password',
  ACCOUNT_DISABLED: 'Account disabled',
  UNKNOWN_EMAIL: 'Unknown email',
};
export const failureLabel = (r) => (r ? FAILURE_LABELS[r] || r.replace(/_/g, ' ').toLowerCase() : '');

/** "invoice.confirmed" -> "Invoice confirmed". Falls back to the raw name. */
export function eventLabel(event) {
  if (!event) return '';
  const text = String(event).replace(/[._]/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const parseBrowser = (ua) => {
  if (!ua) return '-';
  const m = ua.match(/(Edg|Chrome|Firefox|Safari|OPR)\/[\d.]+/);
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const name = m ? m[1].replace('Edg', 'Edge').replace('OPR', 'Opera') : ua.slice(0, 24);
  return [name, os].filter(Boolean).join(' · ');
};

export const fullName = (e) => (e ? e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() : '');
export const personLabel = (e) => (e ? `${fullName(e)}${e.employeeCode ? ` (${e.employeeCode})` : ''}` : '');

/** Page shown when a route needs a permission the user does not hold. No API calls are made. */
export function NoAccessPage({ message }) {
  return (
    <div className="glass-card mx-auto mt-10 max-w-md p-8 text-center space-y-3">
      <ShieldOff className="mx-auto h-10 w-10 text-slate-400" />
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white">No access</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message || 'Your role does not include access to this page.'}</p>
      <Button asChild variant="outline"><Link to="/">Back to dashboard</Link></Button>
    </div>
  );
}

/** Route guard: renders children only when the user holds one of the permissions. */
export function RequirePermission({ any, children }) {
  const { canAny } = useCan();
  return canAny(...any) ? children : <NoAccessPage />;
}

/** All employees for dropdowns (active only by default). Needs platform:employees:read. */
export function useEmployeeOptions({ activeOnly = true, enabled = true } = {}) {
  // activeOnly=false includes ON_LEAVE and EXITED employees (for filters and history).
  return useQuery({
    queryKey: ['employee-options', activeOnly],
    queryFn: async () => (await api.get('/platform/employees', {
      params: { limit: 100, sortBy: 'firstName', sortOrder: 'asc', ...(activeOnly && { status: 'ACTIVE' }) },
    })).data.data,
    enabled,
    staleTime: 60000,
  });
}

/** Searchable employee select. Exited employees are never offered. */
export function EmployeeSelect({ value, onChange, excludeIds = [], emptyLabel = 'Select employee', allowEmpty = true, disabled, required, activeOnly = true }) {
  const { data, isLoading, error } = useEmployeeOptions({ activeOnly });
  const [q, setQ] = useState('');
  const options = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || [])
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => !needle || `${fullName(e)} ${e.employeeCode} ${e.designation || ''}`.toLowerCase().includes(needle));
  }, [data, q, excludeIds]);

  if (error) return <p className="text-xs text-slate-500">The employee list is not available for your role.</p>;
  return (
    <div className="space-y-1.5">
      {(data || []).length > 8 && <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employees..." className="h-9" />}
      <NativeSelect value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled || isLoading} required={required}>
        {allowEmpty && <option value="">{isLoading ? 'Loading...' : emptyLabel}</option>}
        {!allowEmpty && <option value="" disabled>{isLoading ? 'Loading...' : emptyLabel}</option>}
        {options.map((e) => <option key={e.id} value={e.id}>{personLabel(e)}{e.designation ? ` · ${e.designation}` : ''}</option>)}
      </NativeSelect>
    </div>
  );
}

/**
 * One-time temporary password modal. The value lives only in the caller's short-lived state and is
 * cleared by the caller on close.
 */
export function TempPasswordDialog({ password, title = 'Temporary password', subject, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  return (
    <Dialog open={!!password} onOpenChange={(o) => { if (!o) { setCopied(false); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subject ? `For ${subject}. ` : ''}This password is shown only once. Share it securely. The employee must set a new password at first sign-in.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-3">
          <code className="flex-1 select-all break-all text-base font-semibold text-slate-800 dark:text-white">{password}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <DialogFooter><Button onClick={() => { setCopied(false); onClose(); }}>I have saved it</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
