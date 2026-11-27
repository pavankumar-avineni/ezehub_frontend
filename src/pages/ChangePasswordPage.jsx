import { Navigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import ChangePasswordForm from '@/components/shared/ChangePasswordForm';
import { useAuthStore } from '@/stores/authStore';

/** Full-page "Set your password" screen for employees who signed in with a temporary password. */
export default function ChangePasswordPage({ forced = false }) {
  const logout = useAuthStore((s) => s.logout);
  // Outside the forced flow the password lives on the Profile page.
  if (!forced) return <Navigate to="/profile" replace />;

  return (
    <div className="premium-bg flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-md space-y-5 p-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Set your password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You signed in with a temporary password. Choose a new one to continue.</p>
        </div>
        <ChangePasswordForm forced />
        <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
