import { useQuery } from '@tanstack/react-query';
import { Building2, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/platform/tenants/analytics');
      return data.data;
    },
  });

  const planData = data?.planBreakdown?.map((p) => ({
    name: p.plan,
    value: p._count,
  })) || [];

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Overview of all tenants and subscription metrics"
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl glass-card animate-pulse shimmer-glass" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard title="Total Tenants" value={data?.totalTenants ?? 0} icon={Building2} />
            <StatCard title="Active Tenants" value={data?.activeTenants ?? 0} icon={Users} trend="Currently operational" />
            <StatCard title="Suspended" value={data?.suspendedTenants ?? 0} icon={AlertTriangle} />
            <StatCard title="Growth" value={`${data?.activeTenants && data?.totalTenants ? Math.round((data.activeTenants / data.totalTenants) * 100) : 0}%`} subtitle="Active rate" icon={TrendingUp} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Subscription Plans</h3>
              {planData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {planData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.9)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-12">No tenants yet. Create your first tenant to see analytics.</p>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Tenant Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[
                  { name: 'Active', count: data?.activeTenants ?? 0 },
                  { name: 'Suspended', count: data?.suspendedTenants ?? 0 },
                  { name: 'Other', count: (data?.totalTenants ?? 0) - (data?.activeTenants ?? 0) - (data?.suspendedTenants ?? 0) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.9)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
