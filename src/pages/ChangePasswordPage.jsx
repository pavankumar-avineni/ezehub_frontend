import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorText, Field } from '@/components/inventory/common';
import { PageHeader } from '@/components/shared/PageHeader';
import { fieldErrors } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';

export const PASSWORD_RULES = 'At least 8 characters with an uppercase letter, a lowercase letter and a number. It must differ from your current password.';

/** `forced` renders a full-page screen (temporary password). Otherwise it is a normal page. */
export default function ChangePasswordPage({ forced = false }) {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [localError, setLocalError] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (body) => api.post('/auth/change-password', body),
    onSuccess: () => {
      updateUser({ mustChangePassword: false });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      if (forced) navigate('/', { replace: true });
      else setDone(true);
    },
  });
  const errs = fieldErrors(mutation.error);

  const submit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (form.newPassword !== form.confirm) { setLocalError('The new passwords do not match'); return; }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };
  const set = (k) => (e) => { setDone(false); setForm({ ...form, [k]: e.target.value }); };

  const card = (
    <div className="glass-card mx-auto w-full max-w-md space-y-5 p-6">
      {forced && (
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Set your password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You signed in with a temporary password. Choose a new one to continue.</p>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label={forced ? 'Temporary password' : 'Current password'} error={errs.currentPassword}>
          <Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </Field>
        <Field label="New password" error={errs.newPassword}>
          <Input type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} required minLength={8} />
          <p className="text-xs text-slate-500">{PASSWORD_RULES}</p>
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
        </Field>
        {localError && <p className="text-sm text-red-500">{localError}</p>}
        <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
        {done && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Password changed.</p>}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : forced ? 'Set password and continue' : 'Change password'}</Button>
      </form>
      {forced && (
        <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      )}
    </div>
  );

  if (forced) return <div className="premium-bg flex min-h-screen items-center justify-center p-4">{card}</div>;
  return (
    <div>
      <PageHeader title="Change Password" description="Choose a strong password for your account" />
      {card}
    </div>
  );
}
