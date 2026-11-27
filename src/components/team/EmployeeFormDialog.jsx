import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, NativeSelect, SectionTitle, textareaClass, toDateInput } from '@/components/inventory/common';
import { EMPLOYMENT_TYPES, EmployeeSelect, TempPasswordDialog } from '@/components/team/common';
import { fieldErrors } from '@/lib/errors';
import { missingPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';

const EMPTY = {
  firstName: '', lastName: '', email: '', roleId: '', password: '', phone: '', personalEmail: '', personalPhone: '',
  department: '', designation: '', reportsToId: '', joiningDate: '', employmentType: '', address: '', city: '', state: '',
  pincode: '', emergencyName: '', emergencyRelation: '', emergencyPhone: '', idProofType: '', idProofNumber: '', notes: '',
};
const digits = (v, n) => v.replace(/\D/g, '').slice(0, n);

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: ['platform-roles'],
    queryFn: async () => (await api.get('/platform/roles')).data.data,
    enabled,
  });
}

function fromEmployee(e) {
  return {
    ...EMPTY,
    firstName: e.firstName || '', lastName: e.lastName || '', email: e.email || '', roleId: e.role?.id || '',
    phone: e.phone || '', personalEmail: e.personalEmail || '', personalPhone: e.personalPhone || '',
    department: e.department || '', designation: e.designation || '', reportsToId: e.reportsTo?.id || '',
    joiningDate: toDateInput(e.joiningDate), employmentType: e.employmentType || '', address: e.address || '',
    city: e.city || '', state: e.state || '', pincode: e.pincode || '',
    emergencyName: e.emergencyContact?.name || '', emergencyRelation: e.emergencyContact?.relation || '',
    emergencyPhone: e.emergencyContact?.phone || '', idProofType: e.idProofType || '', idProofNumber: e.idProofNumber || '',
    notes: e.notes || '',
  };
}

function buildPayload(form, isEdit) {
  const p = {};
  const simple = ['firstName', 'lastName', 'phone', 'personalEmail', 'personalPhone', 'department', 'designation', 'reportsToId',
    'joiningDate', 'employmentType', 'address', 'city', 'state', 'pincode', 'idProofType', 'idProofNumber', 'notes'];
  simple.forEach((k) => { if (String(form[k]).trim() !== '') p[k] = String(form[k]).trim(); });
  if (!isEdit) {
    p.email = form.email.trim();
    p.roleId = form.roleId;
    if (form.password) p.password = form.password;
  }
  if (form.emergencyName.trim() || form.emergencyPhone.trim() || form.emergencyRelation.trim()) {
    p.emergencyContact = { name: form.emergencyName.trim(), relation: form.emergencyRelation.trim(), phone: form.emergencyPhone.trim() };
  }
  return p;
}

export default function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }) {
  const isEdit = !!employee;
  const [form, setForm] = useState(EMPTY);
  const [tempPassword, setTempPassword] = useState('');
  const [createdName, setCreatedName] = useState('');
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const { data: roles } = useRoles(open && !isEdit);

  useEffect(() => { if (open) setForm(employee ? fromEmployee(employee) : EMPTY); }, [open, employee]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.put(`/platform/employees/${employee.id}`, payload) : api.post('/platform/employees', payload)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employee-options'] });
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
      const data = res.data.data;
      onOpenChange(false);
      if (!isEdit && data?.temporaryPassword) {
        setCreatedName(`${data.employee?.name || form.firstName} (${data.employee?.employeeCode || ''})`);
        setTempPassword(data.temporaryPassword);
      }
      onSaved?.(isEdit ? data : data?.employee);
    },
  });
  const errs = fieldErrors(mutation.error);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const payload = useMemo(() => buildPayload(form, isEdit), [form, isEdit]);
  const changed = useMemo(() => {
    if (!isEdit) return true;
    const original = buildPayload(fromEmployee(employee), true);
    return JSON.stringify(original) !== JSON.stringify(payload);
  }, [isEdit, employee, payload]);

  const roleOptions = (roles || []).map((r) => {
    const missing = missingPermissions(me?.permissions, r.permissions);
    return { ...r, blocked: missing.length > 0, missing };
  });

  const submit = (e) => { e.preventDefault(); mutation.mutate(payload); };
  const err = (k) => errs[k] && <p className="text-xs text-red-500">{errs[k]}</p>;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) mutation.reset(); onOpenChange(o); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? `Edit ${employee.name}` : 'Add Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-6">
            {!isEdit && (
              <div>
                <SectionTitle>Account</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Work email (used to sign in) *"><Input type="email" value={form.email} onChange={set('email')} required />{err('email')}</Field>
                  <Field label="Role *">
                    <NativeSelect value={form.roleId} onChange={set('roleId')} required>
                      <option value="">Select role</option>
                      {roleOptions.map((r) => (
                        <option key={r.id} value={r.id} disabled={r.blocked} title={r.blocked ? `Includes permissions you do not hold: ${r.missing.join(', ')}` : r.description || ''}>
                          {r.name}{r.blocked ? ' (includes permissions you do not hold)' : ''}
                        </option>
                      ))}
                    </NativeSelect>
                    {err('roleId')}
                  </Field>
                  <Field label="Password (optional)">
                    <Input type="text" autoComplete="off" value={form.password} onChange={set('password')} placeholder="Leave empty to auto-generate" />
                    <p className="text-xs text-slate-500">The employee must change it at first sign-in.</p>{err('password')}
                  </Field>
                </div>
              </div>
            )}

            <div>
              <SectionTitle>Personal & contact</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name *"><Input value={form.firstName} onChange={set('firstName')} required />{err('firstName')}</Field>
                <Field label="Last name *"><Input value={form.lastName} onChange={set('lastName')} required />{err('lastName')}</Field>
                <Field label="Work phone (10 digits)"><Input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: digits(e.target.value, 10) })} />{err('phone')}</Field>
                <Field label="Personal email"><Input type="email" value={form.personalEmail} onChange={set('personalEmail')} />{err('personalEmail')}</Field>
                <Field label="Personal phone (10 digits)"><Input inputMode="numeric" value={form.personalPhone} onChange={(e) => setForm({ ...form, personalPhone: digits(e.target.value, 10) })} />{err('personalPhone')}</Field>
              </div>
            </div>

            <div>
              <SectionTitle>Job</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Department"><Input value={form.department} onChange={set('department')} />{err('department')}</Field>
                <Field label="Designation"><Input value={form.designation} onChange={set('designation')} />{err('designation')}</Field>
                <Field label="Reports to">
                  <EmployeeSelect value={form.reportsToId} onChange={(v) => setForm({ ...form, reportsToId: v })} excludeIds={employee ? [employee.id] : []} emptyLabel="No manager" />
                  {err('reportsToId')}
                </Field>
                <Field label="Employment type">
                  <NativeSelect value={form.employmentType} onChange={set('employmentType')}>
                    <option value="">Not set</option>
                    {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </NativeSelect>
                  {err('employmentType')}
                </Field>
                <Field label="Joining date"><Input type="date" value={form.joiningDate} onChange={set('joiningDate')} />{err('joiningDate')}</Field>
              </div>
            </div>

            <div>
              <SectionTitle>Address</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={set('address')} /></Field>
                <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
                <Field label="State"><Input value={form.state} onChange={set('state')} /></Field>
                <Field label="Pincode (6 digits)"><Input inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: digits(e.target.value, 6) })} />{err('pincode')}</Field>
              </div>
            </div>

            <div>
              <SectionTitle>Emergency contact</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Name"><Input value={form.emergencyName} onChange={set('emergencyName')} /></Field>
                <Field label="Relation"><Input value={form.emergencyRelation} onChange={set('emergencyRelation')} /></Field>
                <Field label="Phone"><Input inputMode="numeric" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: digits(e.target.value, 10) })} /></Field>
              </div>
              {(errs['emergencyContact.phone'] || errs.emergencyContact) && <p className="mt-1 text-xs text-red-500">{errs['emergencyContact.phone'] || errs.emergencyContact}</p>}
            </div>

            <div>
              <SectionTitle>ID proof</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="ID type"><Input value={form.idProofType} onChange={set('idProofType')} placeholder="PAN, Aadhaar..." /></Field>
                <Field label="ID number"><Input value={form.idProofNumber} onChange={set('idProofNumber')} /></Field>
              </div>
            </div>

            <Field label="Notes"><textarea className={textareaClass} rows={3} value={form.notes} onChange={set('notes')} /></Field>

            <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending || !changed}>{mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create employee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shown once. The value is dropped from state when the modal closes. */}
      <TempPasswordDialog
        password={tempPassword}
        subject={createdName}
        title="Employee created"
        onClose={() => { setTempPassword(''); setCreatedName(''); }}
      />
    </>
  );
}
