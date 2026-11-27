import { useQuery } from '@tanstack/react-query';
import { Building2, Users, AlertTriangle, TrendingUp, Clock, BadgeCheck, BedDouble, Repeat, Hourglass, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { formatINR } from '@/lib/features';

const COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#94a3b8'];
const tooltipStyle = { borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.9)' };

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: async () => (await api.get('/platform/tenants/analytics')).data.data,
  });
  const { data: billing } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => (await api.get('/subscription/admin/analytics')).data.data,
  });

  const statusData = (data?.subscriptionBreakdown || []).map((s) => ({ name: s.status, value: Number(s.count) || 0 })).filter((s) => s.value > 0);

  return (
    <div>
      <PageHeader title="Platform Dashboard" description="Overview of all tenants and subscription metrics" />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl glass-card animate-pulse shimmer-glass" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <StatCard title="Total Tenants" value={data?.totalTenants ?? 0} icon={Building2} />
            <StatCard title="Active Tenants" value={data?.activeTenants ?? 0} icon={Users} subtitle="Currently operational" />
            <StatCard title="Suspended" value={data?.suspendedTenants ?? 0} icon={AlertTriangle} />
            <StatCard title="Active Rate" value={`${data?.activeTenants && data?.totalTenants ? Math.round((data.activeTenants / data.totalTenants) * 100) : 0}%`} icon={TrendingUp} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard title="Trial Tenants" value={billing?.trialTenants ?? '-'} subtitle={`Trial pipeline: ${formatINR(billing?.trialPipeline)} / month`} icon={Clock} />
            <StatCard title="Paying Tenants" value={billing?.payingTenants ?? '-'} icon={BadgeCheck} />
            <StatCard title="Billable Beds" value={billing?.totalBillableBeds ?? data?.totalBillableBeds ?? 0} subtitle={`Default rate ${formatINR(data?.defaultRatePerBed)} per bed · ${data?.trialDays ?? 0}-day trial`} icon={BedDouble} />
            <StatCard title="Expected Monthly Recurring" value={formatINR(billing?.estimatedMonthlyRecurring)} subtitle={`Collected this month: ${formatINR(billing?.monthlyRevenue)}`} icon={Repeat} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Subscription Status</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
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
                  { name: 'Other', count: Math.max(0, (data?.totalTenants ?? 0) - (data?.activeTenants ?? 0) - (data?.suspendedTenants ?? 0)) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
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
