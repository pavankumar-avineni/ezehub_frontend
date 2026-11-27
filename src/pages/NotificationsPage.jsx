import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ErrorText, Pagination, TabBar, formatDateTime } from '@/components/inventory/common';

const PAGE_SIZE = 20;

/** The API returns { notifications, unreadCount, pagination: { page, limit, total } } inside `data`. */
export function normalizeNotifications(payload) {
  if (Array.isArray(payload)) return { notifications: payload, unreadCount: payload.filter((n) => !n.readAt).length, pagination: null };
  return {
    notifications: payload?.notifications || [],
    unreadCount: payload?.unreadCount ?? 0,
    pagination: payload?.pagination || null,
  };
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all | unread
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => normalizeNotifications((await api.get('/tenant/notifications', { params: { page, limit: PAGE_SIZE } })).data.data),
    refetchInterval: 30000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] }).then(() => queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }));

  const readMutation = useMutation({
    mutationFn: (id) => api.put(`/tenant/notifications/${id}/read`),
    onSuccess: refresh,
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/tenant/notifications/read-all'),
    onSuccess: refresh,
  });

  const all = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? 0;
  const list = filter === 'unread' ? all.filter((n) => !n.readAt) : all;

  const p = data?.pagination;
  const totalPages = p ? Math.max(1, Math.ceil(p.total / p.limit)) : 1;
  const pagination = p && { ...p, totalPages, hasNext: p.page < totalPages, hasPrev: p.page > 1 };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
              <CheckCheck className="h-4 w-4" /> {readAllMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <TabBar
          tabs={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unreadCount }]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <ErrorText error={error || readMutation.error || readAllMutation.error} />

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <BellOff className="h-8 w-8" />
            <p>{filter === 'unread' ? 'You are all caught up' : 'No notifications'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-blue-100/50 dark:divide-blue-900/30">
            {list.map((n) => {
              const unread = !n.readAt;
              return (
                <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3', unread && 'bg-blue-50/50 dark:bg-blue-900/10')}>
                  <div className={cn('mt-0.5 rounded-xl p-2', unread ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-400')}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm text-slate-800 dark:text-white', unread ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                      <span className="shrink-0 text-xs text-slate-500">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 break-words">{n.message}</p>
                  </div>
                  {unread && (
                    <Button
                      variant="ghost" size="sm" className="shrink-0 text-blue-600 hover:text-blue-800"
                      disabled={readMutation.isPending} onClick={() => readMutation.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={pagination} onPage={setPage} />
      </div>
    </div>
  );
}
