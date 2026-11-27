import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChangePasswordForm from '@/components/shared/ChangePasswordForm';
import { DetailField, ErrorText, Field, SectionTitle, formatDateTime } from '@/components/inventory/common';
import { fieldErrors } from '@/lib/errors';
import { formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const digits = (v, n) => v.replace(/\D/g, '').slice(0, n);
const EMPTY = {
  firstName: '', lastName: '', phone: '', personalEmail: '', personalPhone: '', address: '', city: '', state: '', pincode: '',
  ecName: '', ecRelation: '', ecPhone: '',
};

const fromMe = (me) => ({
  ...EMPTY,
  firstName: me.firstName || '', lastName: me.lastName || '', phone: me.phone || '', personalEmail: me.personalEmail || '',
  personalPhone: me.personalPhone || '', address: me.address || '', city: me.city || '', state: me.state || '', pincode: me.pincode || '',
  ecName: me.emergencyContact?.name || '', ecRelation: me.emergencyContact?.relation || '', ecPhone: me.emergencyContact?.phone || '',
});

/** Only send what changed and what the API says this account may edit. */
function diff(form, me) {
  const original = fromMe(me);
  const editable = new Set(me.editableFields || []);
  const out = {};
  ['firstName', 'lastName', 'phone', 'personalEmail', 'personalPhone', 'address', 'city', 'state', 'pincode'].forEach((k) => {
    if (editable.has(k) && form[k].trim() !== original[k]) out[k] = form[k].trim();
  });
  if (editable.has('emergencyContact') && ['ecName', 'ecRelation', 'ecPhone'].some((k) => form[k].trim() !== original[k])) {
    out.emergencyContact = { name: form.ecName.trim(), relation: form.ecRelation.trim(), phone: form.ecPhone.trim() };
  }
  return out;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  const { data: me, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data.data,
  });
  useEffect(() => { if (me) setForm(fromMe(me)); }, [me]);

  const afterChange = (res) => {
    const m = res.data.data;
    queryClient.setQueryData(['me'], m);
    updateUser({ firstName: m.firstName, lastName: m.lastName, avatar: m.avatar || null });
  };

  const save = useMutation({
    mutationFn: (body) => api.put('/auth/me', body),
    onSuccess: (res) => { afterChange(res); setSaved(true); },
  });
  const upload = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/auth/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: afterChange,
  });
  const removePhoto = useMutation({ mutationFn: () => api.delete('/auth/me/avatar'), onSuccess: afterChange });

  const errs = fieldErrors(save.error);
  const changes = useMemo(() => (me ? diff(form, me) : {}), [form, me]);
  const dirty = Object.keys(changes).length > 0;
  const editable = new Set(me?.editableFields || []);
  const set = (k) => (e) => { setSaved(false); setForm((f) => ({ ...f, [k]: e.target.value })); };
  const err = (k) => errs[k] && <p className="text-xs text-red-500">{errs[k]}</p>;
  const isPlatform = me?.scope === 'PLATFORM';

  const submit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    save.mutate(changes);
  };

  if (isLoading) return <p className="py-12 text-center text-slate-400">Loading...</p>;
  if (error) return <ErrorText error={error} />;
  if (!me) return null;

  return (
    <div>
      <PageHeader title="My Profile" description="Update your details and change your password" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="glass-card p-6 text-center space-y-4">
            {me.avatar
              ? <img src={me.avatar} alt="Profile" className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-blue-400/20" />
              : <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-3xl font-bold text-white">{getInitials(me.firstName, me.lastName)}</div>}
            <div>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">{me.firstName} {me.lastName}</p>
              <p className="text-sm text-slate-500">{me.email}</p>
              {me.role?.name && <span className="mt-2 inline-block rounded-lg bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">{me.role.name}</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" /> {upload.isPending ? 'Uploading...' : 'Change photo'}</Button>
              {me.avatar && <Button variant="ghost" size="sm" disabled={removePhoto.isPending} onClick={() => removePhoto.mutate()}><Trash2 className="h-4 w-4 text-red-500" /> Remove</Button>}
            </div>
            <ErrorText error={upload.error || removePhoto.error} />
          </div>

          <div className="glass-card p-6 space-y-3">
            <SectionTitle>Account</SectionTitle>
            <DetailField label="Sign-in email" value={me.email} />
            {me.tenant?.name && <DetailField label="Business" value={me.tenant.name} />}
            {isPlatform && (
              <>
                <DetailField label="Employee code" value={me.employeeCode} />
                <DetailField label="Designation" value={me.designation} />
                <DetailField label="Department" value={me.department} />
                <DetailField label="Reports to" value={me.reportsTo ? `${me.reportsTo.name} (${me.reportsTo.employeeCode})` : null} />
                <DetailField label="Joined" value={me.joiningDate ? formatDate(me.joiningDate) : null} />
              </>
            )}
            <DetailField label="Last sign-in" value={me.lastLoginAt ? formatDateTime(me.lastLoginAt) : null} />
            {isPlatform && <DetailField label="Password last changed" value={me.passwordChangedAt ? formatDateTime(me.passwordChangedAt) : null} />}
            <p className="text-xs text-slate-500">Email, role and job details are managed by an administrator.</p>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={submit} className="glass-card p-6 space-y-6">
            <div>
              <SectionTitle>Personal details</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name *"><Input value={form.firstName} onChange={set('firstName')} required />{err('firstName')}</Field>
                <Field label="Last name *"><Input value={form.lastName} onChange={set('lastName')} required />{err('lastName')}</Field>
                {editable.has('phone') && <Field label="Phone (10 digits)"><Input inputMode="numeric" value={form.phone} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, phone: digits(e.target.value, 10) })); }} />{err('phone')}</Field>}
                {editable.has('personalEmail') && <Field label="Personal email"><Input type="email" value={form.personalEmail} onChange={set('personalEmail')} />{err('personalEmail')}</Field>}
                {editable.has('personalPhone') && <Field label="Personal phone (10 digits)"><Input inputMode="numeric" value={form.personalPhone} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, personalPhone: digits(e.target.value, 10) })); }} />{err('personalPhone')}</Field>}
              </div>
            </div>

            {editable.has('address') && (
              <div>
                <SectionTitle>Address</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={set('address')} />{err('address')}</Field>
                  <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
                  <Field label="State"><Input value={form.state} onChange={set('state')} /></Field>
                  <Field label="Pincode (6 digits)"><Input inputMode="numeric" value={form.pincode} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, pincode: digits(e.target.value, 6) })); }} />{err('pincode')}</Field>
                </div>
              </div>
            )}

            {editable.has('emergencyContact') && (
              <div>
                <SectionTitle>Emergency contact</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Name"><Input value={form.ecName} onChange={set('ecName')} /></Field>
                  <Field label="Relation"><Input value={form.ecRelation} onChange={set('ecRelation')} /></Field>
                  <Field label="Phone"><Input inputMode="numeric" value={form.ecPhone} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, ecPhone: digits(e.target.value, 10) })); }} /></Field>
                </div>
                {(errs['emergencyContact.phone'] || errs.emergencyContact) && <p className="mt-1 text-xs text-red-500">{errs['emergencyContact.phone'] || errs.emergencyContact}</p>}
              </div>
            )}

            <ErrorText error={save.error && !Object.keys(errs).length ? save.error : null} />
            {saved && !dirty && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Profile saved.</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={!dirty || save.isPending}>{save.isPending ? 'Saving...' : 'Save changes'}</Button>
              <Button type="button" variant="outline" disabled={!dirty} onClick={() => setForm(fromMe(me))}>Reset</Button>
            </div>
          </form>

          <div id="password" className="glass-card p-6 space-y-4">
            <div>
              <SectionTitle className="mb-1">Change password</SectionTitle>
              <p className="text-sm text-slate-500">Enter your current password, then choose a new one.</p>
            </div>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
