import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Check, X, Key, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText } from '@/components/inventory/common';
import { fieldErrors } from '@/lib/errors';

// The API rejects these with 403, so they never appear in the picker.
const HIDDEN_PERMISSION_PREFIXES = ['tenants:', 'platform:'];
const isAssignable = (p) => !HIDDEN_PERMISSION_PREFIXES.some((prefix) => (p.code || '').startsWith(prefix));

function RoleFormDialog({ open, onOpenChange, role, permsByModule }) {
  const isEdit = !!role;
  const [form, setForm] = useState({ name: '', description: '' });
  const [perms, setPerms] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setForm({ name: role?.name || '', description: role?.description || '' });
      setPerms([]);
    }
  }, [open, role]);

  const mutation = useMutation({
    mutationFn: (body) => (isEdit ? api.put(`/tenant/roles/${role.id}`, body) : api.post('/tenant/roles', body)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); onOpenChange(false); },
  });
  const errs = fieldErrors(mutation.error);

  const submit = () => {
    const body = { name: form.name.trim(), ...(form.description.trim() && { description: form.description.trim() }) };
    if (isEdit) {
      const patch = {};
      if (body.name !== role.name) patch.name = body.name;
      if ((body.description || '') !== (role.description || '')) patch.description = body.description || '';
      mutation.mutate(patch);
    } else {
      mutation.mutate({ ...body, permissionIds: perms });
    }
  };

  const isDirty = !isEdit || form.name.trim() !== role.name || form.description.trim() !== (role.description || '');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) mutation.reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? `Edit ${role.name}` : 'Create New Role'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Warden, Accountant, Manager..." />
              {errs.name && <p className="text-xs text-red-500">{errs.name}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this role does" />
              {errs.description && <p className="text-xs text-red-500">{errs.description}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Assign Permissions ({perms.length} selected)</p>
              {Object.entries(permsByModule).map(([module, list]) => (
                <div key={module} className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-blue-600 uppercase">{module}</p>
                    <button type="button" className="text-[10px] text-blue-500 hover:underline" onClick={() => {
                      const ids = list.map((p) => p.id);
                      const all = ids.every((id) => perms.includes(id));
                      setPerms((prev) => (all ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
                    }}>
                      {list.every((p) => perms.includes(p.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                    {list.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={perms.includes(p.id)} onChange={() => setPerms((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]))} className="rounded border-blue-300" />
                        <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!form.name.trim() || !isDirty || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const [formRole, setFormRole] = useState(undefined); // undefined = closed, null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const queryClient = useQueryClient();

  const { data: roles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/tenant/roles')).data.data,
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/tenant/permissions')).data.data,
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }) => api.put(`/tenant/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tenant/roles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setDeleteTarget(null); },
  });

  const assignable = useMemo(() => (permissions || []).filter(isAssignable), [permissions]);
  const permsByModule = useMemo(() => assignable.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {}), [assignable]);

  const permIdsOf = (role) => role.permissions?.map((rp) => rp.permission?.id || rp.permissionId) || [];
  const hasPermission = (role, permId) => permIdsOf(role).includes(permId);

  const togglePermission = (role, permId) => {
    const current = permIdsOf(role);
    // Keep permissions that are hidden from the picker out of the payload (the API would reject them).
    const hidden = new Set((permissions || []).filter((p) => !isAssignable(p)).map((p) => p.id));
    const next = (current.includes(permId) ? current.filter((id) => id !== permId) : [...current, permId]).filter((id) => !hidden.has(id));
    updatePermsMutation.mutate({ roleId: role.id, permissionIds: next });
  };

  const userCount = (role) => (role._count?.tenantUsers || 0) + (role._count?.staffMembers || 0);

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Create roles, assign permissions — staff sees only what their role allows" actions={
        <Button onClick={() => setFormRole(null)}><Plus className="h-4 w-4" /> Create Role</Button>
      } />
      <ErrorText error={rolesError || updatePermsMutation.error} />

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Roles</h2>
        </div>

        <div className="space-y-3">
          {(roles || []).map((role) => (
            <div key={role.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10" onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{role.name}{role.isSystem && <span className="ml-2 text-[10px] font-semibold uppercase text-amber-600">System</span>}</h3>
                    <p className="text-xs text-slate-500">{role.code} • {role.permissions?.length || 0} permissions • {userCount(role)} users</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" title={role.isSystem ? 'System roles cannot be edited' : 'Edit role'} disabled={role.isSystem} onClick={() => setFormRole(role)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'} disabled={role.isSystem} onClick={() => { deleteMutation.reset(); setDeleteTarget(role); }}>
                    <Trash2 className={`h-4 w-4 ${role.isSystem ? '' : 'text-red-400'}`} />
                  </Button>
                  <span className="ml-2 text-xs text-blue-600 font-medium">{expandedRole === role.id ? 'Hide ▲' : 'Show Permissions ▼'}</span>
                </div>
              </div>

              {expandedRole === role.id && (
                <div className="border-t border-blue-100/50 dark:border-blue-900/30 p-4 bg-slate-50/50 dark:bg-slate-900/30">
                  {role.isSystem && <p className="text-xs text-amber-600 mb-3">⚠️ System role — all permissions granted</p>}
                  <div className="space-y-4">
                    {Object.entries(permsByModule).map(([module, list]) => (
                      <div key={module}>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{module}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                          {list.map((p) => {
                            const active = hasPermission(role, p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => !role.isSystem && togglePermission(role, p.id)}
                                disabled={role.isSystem || updatePermsMutation.isPending}
                                className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                  active
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-200'
                                } ${role.isSystem ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                              >
                                {active ? <Check className="h-3 w-3 text-blue-600" /> : <X className="h-3 w-3 text-slate-400" />}
                                <span className="truncate">{p.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">All Permissions</h2>
          <span className="text-xs text-slate-400 ml-2">({assignable.length} total)</span>
        </div>
        <div className="glass-card p-5">
          <div className="space-y-5">
            {Object.entries(permsByModule).map(([module, list]) => (
              <div key={module}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{module}</span>
                  <span className="text-[10px] text-slate-400">({list.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {list.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                      <Key className="h-3 w-3 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RoleFormDialog open={formRole !== undefined} onOpenChange={(o) => !o && setFormRole(undefined)} role={formRole || null} permsByModule={permsByModule} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete role?</DialogTitle>
            <DialogDescription>Delete <b>{deleteTarget?.name}</b>. Roles that are still assigned to users or staff cannot be deleted.</DialogDescription>
          </DialogHeader>
          <ErrorText error={deleteMutation.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
