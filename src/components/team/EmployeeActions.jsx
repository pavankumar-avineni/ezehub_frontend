import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, KeyRound, LogOut, Pencil, Repeat, Trash2, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, NativeSelect, textareaClass } from '@/components/inventory/common';
import { EMPLOYEE_STATUSES, EmployeeSelect, TempPasswordDialog } from '@/components/team/common';
import EmployeeFormDialog, { useRoles } from '@/components/team/EmployeeFormDialog';
import { fieldErrors } from '@/lib/errors';
import { missingPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';

function useEmployeeMutation(employeeId, request, onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (res) => {
      ['employee', 'employees', 'employee-options', 'org-chart', 'employee-tenants'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      onDone?.(res);
    },
  });
}

function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, request, onDone, employeeId }) {
  const m = useEmployeeMutation(employeeId, request, (res) => { onOpenChange(false); onDone?.(res); });
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <ErrorText error={m.error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? 'Working...' : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ open, onOpenChange, employee }) {
  const me = useAuthStore((s) => s.user);
  const { data: roles } = useRoles(open);
  const [roleId, setRoleId] = useState('');
  useEffect(() => { if (open) setRoleId(employee.role?.id || ''); }, [open, employee]);
  const m = useEmployeeMutation(employee.id, (body) => api.put(`/platform/employees/${employee.id}/role`, body), () => onOpenChange(false));
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>{employee.name} will be signed out and must sign in again with the new access.</DialogDescription>
        </DialogHeader>
        <Field label="Role">
          <NativeSelect value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {(roles || []).map((r) => {
              const missing = missingPermissions(me?.permissions, r.permissions);
              return <option key={r.id} value={r.id} disabled={missing.length > 0} title={missing.length ? `Includes permissions you do not hold: ${missing.join(', ')}` : ''}>{r.name}{missing.length ? ' (includes permissions you do not hold)' : ''}</option>;
            })}
          </NativeSelect>
        </Field>
        <ErrorText error={m.error} />
        <DialogFooter>
          <Button disabled={m.isPending || !roleId || roleId === employee.role?.id} onClick={() => m.mutate({ roleId })}>{m.isPending ? 'Saving...' : 'Change role'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ open, onOpenChange, employee }) {
  const [status, setStatus] = useState('ACTIVE');
  const [reason, setReason] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [handover, setHandover] = useState('');
  const managed = employee.stats?.tenantsManaged ?? 0;
  useEffect(() => { if (open) { setStatus(employee.employeeStatus); setReason(''); setExitDate(''); setHandover(''); } }, [open, employee]);
  const m = useEmployeeMutation(employee.id, (body) => api.put(`/platform/employees/${employee.id}/status`, body), () => onOpenChange(false));
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const errs = fieldErrors(m.error);
  const needsHandover = status === 'EXITED' && managed > 0;

  const submit = (e) => {
    e.preventDefault();
    m.mutate({
      status,
      ...(reason.trim() && { reason: reason.trim() }),
      ...(status === 'EXITED' && exitDate && { exitDate }),
      ...(needsHandover && { reassignTenantsTo: handover }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Set status</DialogTitle><DialogDescription>{employee.name} ({employee.employeeCode})</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Status">
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
              {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </NativeSelect>
          </Field>
          {status === 'EXITED' && (
            <>
              <p className="text-xs text-amber-600">An exited employee can no longer sign in and is signed out everywhere.</p>
              <Field label="Exit date" error={errs.exitDate}><Input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} /></Field>
            </>
          )}
          {needsHandover && (
            <Field label={`Hand over ${managed} tenant${managed === 1 ? '' : 's'} to *`} error={errs.reassignTenantsTo}>
              <EmployeeSelect value={handover} onChange={setHandover} excludeIds={[employee.id]} emptyLabel="Select an employee" />
              <p className="text-xs text-slate-500">All {managed} tenants this employee maintains move to the selected employee.</p>
            </Field>
          )}
          <Field label="Reason (optional)"><textarea className={textareaClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
          <DialogFooter>
            <Button type="submit" disabled={m.isPending || status === employee.employeeStatus || (needsHandover && !handover)}>{m.isPending ? 'Saving...' : 'Update status'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ open, onOpenChange, employee, onTemp }) {
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) setPassword(''); }, [open]);
  const m = useEmployeeMutation(employee.id, (body) => api.post(`/platform/employees/${employee.id}/reset-password`, body), (res) => {
    onOpenChange(false);
    onTemp(res.data.data.temporaryPassword);
  });
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const errs = fieldErrors(m.error);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{employee.name} is signed out and must set a new password at the next sign-in.</DialogDescription>
        </DialogHeader>
        <Field label="Temporary password (optional)" error={errs.password}>
          <Input autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty to auto-generate" />
        </Field>
        <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
        <DialogFooter>
          <Button disabled={m.isPending} onClick={() => m.mutate(password.trim() ? { password: password.trim() } : {})}>{m.isPending ? 'Resetting...' : 'Reset password'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Action menu for one employee. Rendered only for users with platform:employees:manage. */
export default function EmployeeActions({ employee }) {
  const me = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [dlg, setDlg] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const isSelf = employee.id === me?.id;
  const exited = employee.employeeStatus === 'EXITED';

  const items = [
    { key: 'edit', icon: Pencil, label: 'Edit details' },
    { key: 'role', icon: UserCog, label: 'Change role', self: true },
    { key: 'status', icon: Repeat, label: 'Set status', self: true },
    { key: 'reset', icon: KeyRound, label: 'Reset password', self: true },
    { key: 'sessions', icon: LogOut, label: 'Sign out of all devices' },
    { key: 'delete', icon: Trash2, label: 'Delete', self: true, danger: true },
  ];

  const open = (key) => { setMenu(false); setDlg(key); };
  const close = (key) => (v) => { if (!v && dlg === key) setDlg(null); };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setMenu((v) => !v)}>Actions <ChevronDown className="h-4 w-4" /></Button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white dark:bg-slate-900 p-1 shadow-xl">
            {items.map(({ key, icon: Icon, label, self, danger }) => {
              const blocked = (self && isSelf) || (exited && ['role', 'reset'].includes(key));
              const title = self && isSelf ? 'You cannot do this to your own account' : exited && blocked ? 'Not available for exited employees' : '';
              return (
                <button
                  key={key} type="button" disabled={blocked} title={title} onClick={() => open(key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:hover:bg-transparent ${danger ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <EmployeeFormDialog open={dlg === 'edit'} onOpenChange={close('edit')} employee={employee} />
      <RoleDialog open={dlg === 'role'} onOpenChange={close('role')} employee={employee} />
      <StatusDialog open={dlg === 'status'} onOpenChange={close('status')} employee={employee} />
      <ResetPasswordDialog open={dlg === 'reset'} onOpenChange={close('reset')} employee={employee} onTemp={setTempPassword} />
      <ConfirmDialog
        open={dlg === 'sessions'} onOpenChange={close('sessions')} employeeId={employee.id}
        title="Sign out of all devices?" description={`${employee.name} will have to sign in again everywhere.`} confirmLabel="Sign out everywhere"
        request={() => api.post(`/platform/employees/${employee.id}/revoke-sessions`)}
      />
      <ConfirmDialog
        open={dlg === 'delete'} onOpenChange={close('delete')} employeeId={employee.id} destructive
        title="Delete employee?" description={`${employee.name} (${employee.employeeCode}) will be removed. This fails if they still maintain tenants. Use "Set status > Exited" to keep their history.`}
        confirmLabel="Delete" request={() => api.delete(`/platform/employees/${employee.id}`)} onDone={() => navigate('/employees')}
      />
      <TempPasswordDialog password={tempPassword} subject={employee.name} title="Password reset" onClose={() => setTempPassword('')} />
    </div>
  );
}
