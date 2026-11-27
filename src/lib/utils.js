import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function getStatusColor(status) {
  const colors = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    SUSPENDED: 'bg-red-500/10 text-red-600 dark:text-red-400',
    OPEN: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    IN_PROGRESS: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    OVERDUE: 'bg-red-500/10 text-red-600 dark:text-red-400',
    OCCUPIED: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    AVAILABLE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    CHECKED_OUT: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    CHECKED_IN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    OTP_SENT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    VERIFIED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    SCHEDULED: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    READ: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    SENT: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    NEW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    GOOD: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    FAIR: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    POOR: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    DAMAGED: 'bg-red-500/10 text-red-600 dark:text-red-400',
    IN_USE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    IN_STORAGE: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    UNDER_REPAIR: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    LOST: 'bg-red-500/10 text-red-600 dark:text-red-400',
    DISPOSED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    CANCELLED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    FOUND: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    MISSING: 'bg-red-500/10 text-red-600 dark:text-red-400',
    UNEXPECTED: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    TRIAL: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    ON_HOLD: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    DISMISSED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    ENABLED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    DISABLED: 'bg-red-500/10 text-red-600 dark:text-red-400',
    PRICE_SET: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    PRICE_RESET: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    CATALOG_UPDATED: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    EXPIRED: 'bg-red-500/10 text-red-600 dark:text-red-400',
    EXPIRING_SOON: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    REPAIR: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    SERVICE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    INSPECTION: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-600';
}
