import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorText, Field } from '@/components/inventory/common';
import { fieldErrors } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';

export const PLATFORM_PASSWORD_RULES = 'At least 8 characters with an uppercase letter, a lowercase letter and a number. It must differ from your current password.';
export const BASIC_PASSWORD_RULES = 'At least 8 characters. It must differ from your current password.';

function PasswordInput({ value, onChange, autoComplete, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required={required} className="pr-10" />
      <button type="button" tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Change password: current password + new password + confirmation. Used by the Profile page
 * and by the forced "set your password" screen (employees on a temporary password).
 */
export default function ChangePasswordForm({ forced = false, onSuccess }) {
  const scope = useAuthStore((s) => s.user?.scope);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [localError, setLocalError] = useState('');
  const [done, setDone] = useState(false);
  const strong = scope === 'PLATFORM';

  const mutation = useMutation({
    mutationFn: (body) => api.post('/auth/change-password', body),
    onSuccess: () => {
      if (scope === 'PLATFORM') updateUser({ mustChangePassword: false });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
      onSuccess?.();
    },
  });
  const errs = fieldErrors(mutation.error);

  const set = (k) => (e) => { setDone(false); setLocalError(''); setForm((f) => ({ ...f, [k]: e.target.value })); };

  const submit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (form.newPassword.length < 8) { setLocalError('The new password must be at least 8 characters'); return; }
    if (strong && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) { setLocalError('Use an uppercase letter, a lowercase letter and a number'); return; }
    if (form.newPassword === form.currentPassword) { setLocalError('The new password must be different from the current one'); return; }
    if (form.newPassword !== form.confirm) { setLocalError('The new passwords do not match'); return; }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={forced ? 'Temporary password' : 'Current password'} error={errs.currentPassword}>
        <PasswordInput value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
      </Field>
      <Field label="New password" error={errs.newPassword}>
        <PasswordInput value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
        <p className="text-xs text-slate-500">{strong ? PLATFORM_PASSWORD_RULES : BASIC_PASSWORD_RULES}</p>
      </Field>
      <Field label="Confirm new password">
        <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
      </Field>
      {localError && <p className="text-sm text-red-500">{localError}</p>}
      <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
      {done && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Password changed.</p>}
      <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : forced ? 'Set password and continue' : 'Change password'}
      </Button>
    </form>
  );
}
