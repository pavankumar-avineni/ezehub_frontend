import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pause, Play, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

const PLANS = ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'];

export default function PlatformTenantsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', plan: 'STARTER',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
  });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search],
    queryFn: async () => {
      const { data } = await api.get('/platform/tenants', { params: { search, limit: 50 } });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/platform/tenants', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      setOpen(false);
      setForm({ name: '', email: '', phone: '', plan: 'STARTER', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => api.post(`/platform/tenants/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/tenants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = data?.data || [];

  const handleCreate = (e) => {
    e.preventDefault();
    setErrors({});
    createMutation.mutate(form, {
      onError: (error) => {
        if (error.response?.data?.errors) {
          const fieldErrors = {};
          error.response.data.errors.forEach(err => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        }
      }
    });
  };

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Manage accommodation businesses on the platform"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New Tenant</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="9898989898" />
                    <p className="text-xs text-slate-400">10 digits required</p>
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Plan</Label>
                    <select className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
                      {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <hr className="border-blue-100/50 dark:border-blue-900/30" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={form.adminFirstName} onChange={(e) => updateField('adminFirstName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={form.adminLastName} onChange={(e) => updateField('adminLastName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input type="email" value={form.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={form.adminPassword} onChange={(e) => updateField('adminPassword', e.target.value)} required placeholder="Admin@123456" />
                    <p className="text-xs text-slate-400">Min 8 chars, uppercase, lowercase, number</p>
                    {errors.adminPassword && <p className="text-sm text-red-500">{errors.adminPassword}</p>}
                  </div>
                </div>
                {createMutation.error && !errors.name && !errors.email && !errors.phone && !errors.adminPassword && (
                  <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to create tenant'}</p>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>Create Tenant</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
            ) : tenants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No tenants found</TableCell></TableRow>
            ) : tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-semibold text-slate-800 dark:text-white">{tenant.name}</TableCell>
                <TableCell>{tenant.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {tenant.subscription?.plan || '-'}
                  </span>
                </TableCell>
                <TableCell><StatusBadge status={tenant.status} /></TableCell>
                <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {tenant.status === 'ACTIVE' ? (
                      <Button variant="ghost" size="icon" title="Suspend" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'suspend' })}>
                        <Pause className="h-4 w-4 text-amber-500" />
                      </Button>
                    ) : tenant.status === 'SUSPENDED' ? (
                      <Button variant="ghost" size="icon" title="Activate" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'activate' })}>
                        <Play className="h-4 w-4 text-emerald-500" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm(`Delete tenant "${tenant.name}"? This soft-deletes the account.`)) deleteMutation.mutate(tenant.id); }}>
                      <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
