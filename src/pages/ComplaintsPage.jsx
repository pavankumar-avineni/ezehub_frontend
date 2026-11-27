import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { useFeature } from '@/hooks/useFeature';
import { FEATURE } from '@/lib/features';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function ComplaintsPage() {
  const hasStaff = useFeature(FEATURE.STAFF); // staff list is a separate add-on
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [form, setForm] = useState({ buildingId: '', residentId: '', title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM' });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => (await api.get('/tenant/complaints', { params: { limit: 50 } })).data,
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings-list'],
    queryFn: async () => (await api.get('/tenant/buildings', { params: { limit: 100 } })).data.data,
  });

  const { data: residents } = useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => (await api.get('/tenant/residents', { params: { limit: 200, status: 'ACTIVE' } })).data.data,
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => (await api.get('/tenant/staff', { params: { limit: 100 } })).data.data,
    enabled: hasStaff,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['complaint-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/complaints/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/complaints', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['complaints'] }); 
      setOpen(false); 
      setForm({ buildingId: '', residentId: '', title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM' });
      setErrors({});
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => { fieldErrors[err.field] = err.message; });
        setErrors(fieldErrors);
      }
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedStaffId }) => api.post(`/tenant/complaints/${id}/assign`, { assignedStaffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint-detail', selectedId] });
      setSelectedStaffId('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, resolution }) => api.put(`/tenant/complaints/${id}/status`, { status, resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint-detail', selectedId] });
      setResolutionText('');
    },
  });

  const items = data?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.buildingId) { setErrors({ buildingId: 'Please select a building' }); return; }
    if (!form.residentId) { setErrors({ residentId: 'Please select a resident' }); return; }
    if (form.title.trim().length < 3) { setErrors({ title: 'Title must be at least 3 characters' }); return; }
    if (form.description.trim().length < 10) { setErrors({ description: 'Description must be at least 10 characters' }); return; }
    createMutation.mutate({
      buildingId: form.buildingId,
      residentId: form.residentId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
    });
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Complaints"
        description="Track and resolve resident issues"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Complaint
          </Button>
        }
      />
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No complaints</TableCell></TableRow>
              : items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(c.id)}>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell><StatusBadge status={c.priority} /></TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Complaint Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Complaint</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Building *</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                value={form.buildingId}
                onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                required
              >
                <option value="">Select building</option>
                {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {errors.buildingId && <p className="text-xs text-red-500">{errors.buildingId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Resident *</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                value={form.residentId}
                onChange={(e) => setForm({ ...form, residentId: e.target.value })}
                required
              >
                <option value="">Select resident</option>
                {(residents || [])
                  .filter((r) => !form.buildingId || r.buildingId === form.buildingId || r.building?.id === form.buildingId)
                  .map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.phone})</option>)}
              </select>
              {errors.residentId && <p className="text-xs text-red-500">{errors.residentId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. AC leaking in room 204"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {['MAINTENANCE', 'CLEANLINESS', 'FOOD', 'NOISE', 'BILLING', 'SECURITY', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <textarea
                className="flex w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                rows={3}
                placeholder="Detailed description of the issue (min 10 characters)..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complaint Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Complaint Info</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Title" value={detailData.title} />
                  <DetailField label="Category" value={detailData.category} />
                  <DetailField label="Priority" value={detailData.priority} />
                  <DetailField label="Status" value={detailData.status} />
                  <DetailField label="Created" value={formatDate(detailData.createdAt)} />
                  <DetailField label="Building" value={detailData.building?.name} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{detailData.description || '-'}</p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">People</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Resident" value={detailData.resident ? `${detailData.resident.firstName} ${detailData.resident.lastName}` : null} />
                  <DetailField label="Assigned Staff" value={detailData.assignedStaff ? `${detailData.assignedStaff.firstName} ${detailData.assignedStaff.lastName}` : null} />
                </div>
              </div>

              {/* Staff Assignment (needs the Staff add-on) */}
              {hasStaff && <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-2">Assign Staff</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-9 rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-xs focus:outline-none"
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                  >
                    <option value="">Select staff member</option>
                    {(staffList || []).map((s) => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role?.name || s.phone})</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!selectedStaffId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ id: selectedId, assignedStaffId: selectedStaffId })}
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </div>}

              {/* Status Update & Resolution */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider">Update Status</p>
                {detailData.status !== 'RESOLVED' && detailData.status !== 'CLOSED' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Resolution notes (optional)..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {detailData.status !== 'IN_PROGRESS' && detailData.status !== 'RESOLVED' && detailData.status !== 'CLOSED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedId, status: 'IN_PROGRESS' })}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {detailData.status !== 'RESOLVED' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedId, status: 'RESOLVED', resolution: resolutionText || 'Resolved' })}
                    >
                      Resolve
                    </Button>
                  )}
                  {detailData.status !== 'CLOSED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedId, status: 'CLOSED' })}
                    >
                      Close
                    </Button>
                  )}
                  {detailData.status !== 'REJECTED' && detailData.status !== 'RESOLVED' && detailData.status !== 'CLOSED' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedId, status: 'REJECTED', resolution: resolutionText || 'Rejected' })}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
