import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, SectionTitle } from '@/components/inventory/common';
import { fieldErrors } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';
import { has } from '@/lib/permissions';
import { cn } from '@/lib/utils';

function usePermissionCatalog() {
  return useQuery({
    queryKey: ['platform-permissions'],
    queryFn: async () => (await api.get('/platform/permissions')).data.data,
  });
}

const groupOf = (perms) => {
  const map = new Map();
  (perms || []).forEach((p) => { const g = p.group || 'Other'; if (!map.has(g)) map.set(g, []); map.get(g).push(p); });
  return [...map.entries()];
};

/** Permission checklist grouped by `group`. Permissions you do not hold cannot be switched on or off by you. */
function PermissionPicker({ catalog, selected, onChange, readOnly, original = [] }) {
  const me = useAuthStore((s) => s.user);
  const set = new Set(selected);
  const toggle = (id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); onChange([...n]); };
  return (
    <div className="space-y-4">
      {groupOf(catalog).map(([group, list]) => (
        <div key={group}>
          <SectionTitle className="mb-2">{group}</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {list.map((p) => {
              const held = has(me?.permissions, p.code);
              const locked = readOnly || !held;
              return (
                <label
                  key={p.id}
                  title={!held && !readOnly ? 'You do not hold this permission, so you cannot grant or remove it' : ''}
                  className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', locked ? 'opacity-60' : 'cursor-pointer', set.has(p.id) ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-900/20' : 'border-blue-100/70 dark:border-blue-900/30')}
                >
                  <input type="checkbox" className="mt-1" checked={set.has(p.id)} disabled={locked} onChange={() => toggle(p.id)} />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800 dark:text-white">{p.name}</span>
                    {p.description && <span className="block text-xs text-slate-500">{p.description}</span>}
                    <span className="block text-[10px] text-slate-400">{p.code}{original.includes(p.id) !== set.has(p.id) ? ' · changed' : ''}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleFormDialog({ open, onOpenChange, role, catalog }) {
  const isEdit = !!role;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });
  const [perms, setPerms] = useState([]);
  useEffect(() => { if (open) { setForm({ name: role?.name || '', description: role?.description || '' }); setPerms([]); } }, [open, role]);

  const m = useMutation({
    mutationFn: (body) => (isEdit ? api.put(`/platform/roles/${role.id}`, body) : api.post('/platform/roles', body)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['platform-roles'] }); onOpenChange(false); },
  });
  const errs = fieldErrors(m.error);
  useEffect(() => { if (!open) m.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    const body = { name: form.name.trim(), ...(form.description.trim() ? { description: form.description.trim() } : isEdit ? { description: '' } : {}) };
    m.mutate(isEdit ? body : { ...body, permissionIds: perms });
  };
  const unchanged = isEdit && form.name.trim() === role.name && form.description.trim() === (role.description || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? `Rename ${role.name}` : 'Create role'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" error={errs.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Description" error={errs.description}><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
          {!isEdit && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Permissions ({perms.length})</p>
              <PermissionPicker catalog={catalog} selected={perms} onChange={setPerms} />
            </div>
          )}
          <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
          <DialogFooter><Button type="submit" disabled={m.isPending || !form.name.trim() || unchanged}>{m.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create role'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleCard({ role, catalog, onRename, onDelete }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const original = useMemo(() => (role.permissions || []).map((p) => p.id), [role]);
  const [selected, setSelected] = useState(original);
  const [result, setResult] = useState(null);
  useEffect(() => { setSelected(original); }, [original]);

  const m = useMutation({
    mutationFn: (permissionIds) => api.put(`/platform/roles/${role.id}/permissions`, { permissionIds }),
    onSuccess: (res) => { setResult(res.data.data); queryClient.invalidateQueries({ queryKey: ['platform-roles'] }); queryClient.invalidateQueries({ queryKey: ['employee'] }); },
  });
  const dirty = selected.length !== original.length || selected.some((id) => !original.includes(id));
  const deleteBlocked = role.isSystem || role.employeeCount > 0;

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600"><Shield className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="flex flex-wrap items-center gap-2 font-semibold text-slate-800 dark:text-white">
              {role.name}
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase', role.isSystem ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600')}>{role.isSystem ? 'Ready-made' : 'Custom'}</span>
              {role.isLocked && <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600"><Lock className="h-3 w-3" /> Locked</span>}
            </h3>
            <p className="text-xs text-slate-500">{role.description || role.code} · {role.employeeCount} employee{role.employeeCount === 1 ? '' : 's'} · {(role.permissions || []).length} permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" title={role.isLocked ? 'Locked role' : 'Rename'} disabled={role.isLocked} onClick={() => onRename(role)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title={role.isSystem ? 'Ready-made roles cannot be deleted' : role.employeeCount > 0 ? 'Reassign its employees first' : 'Delete'} disabled={deleteBlocked} onClick={() => onDelete(role)}>
            <Trash2 className={cn('h-4 w-4', !deleteBlocked && 'text-red-500')} />
          </Button>
          <span className="ml-1 text-xs font-medium text-blue-600">{open ? 'Hide ▲' : 'Permissions ▼'}</span>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-blue-100/50 dark:border-blue-900/30 bg-slate-50/50 dark:bg-slate-900/30 p-4">
          {role.isLocked && <p className="text-xs text-amber-600">This role always holds every permission and cannot be changed.</p>}
          <PermissionPicker catalog={catalog} selected={selected} onChange={(v) => { setResult(null); setSelected(v); }} readOnly={role.isLocked} original={original} />
          <ErrorText error={m.error} />
          {result && (
            <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Saved. Added: {result.added?.length ? result.added.join(', ') : 'none'}. Removed: {result.removed?.length ? result.removed.join(', ') : 'none'}.
            </div>
          )}
          {!role.isLocked && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={!dirty} onClick={() => { setSelected(original); setResult(null); }}>Reset</Button>
              <Button disabled={!dirty || m.isPending} onClick={() => m.mutate(selected)}>{m.isPending ? 'Saving...' : 'Save permissions'}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlatformRolesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(undefined); // undefined closed, null create, role = rename
  const [del, setDel] = useState(null);
  const { data: roles, isLoading, error } = useQuery({ queryKey: ['platform-roles'], queryFn: async () => (await api.get('/platform/roles')).data.data });
  const { data: catalog } = usePermissionCatalog();

  const delMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/roles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['platform-roles'] }); setDel(null); },
  });

  return (
    <div>
      <PageHeader
        title="Roles & Access"
        description="Access is decided by permissions. You can only grant permissions you hold yourself."
        actions={<Button onClick={() => setForm(null)}><Plus className="h-4 w-4" /> Create role</Button>}
      />
      <ErrorText error={error} />
      <div className="space-y-3">
        {isLoading && <p className="py-8 text-center text-slate-400">Loading...</p>}
        {(roles || []).map((r) => <RoleCard key={r.id} role={r} catalog={catalog || []} onRename={setForm} onDelete={(role) => { delMutation.reset(); setDel(role); }} />)}
      </div>

      <RoleFormDialog open={form !== undefined} onOpenChange={(o) => !o && setForm(undefined)} role={form || null} catalog={catalog || []} />

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete role?</DialogTitle><DialogDescription>Delete <b>{del?.name}</b>. Ready-made roles and roles that still have employees cannot be deleted.</DialogDescription></DialogHeader>
          <ErrorText error={delMutation.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={delMutation.isPending} onClick={() => delMutation.mutate(del.id)}>{delMutation.isPending ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
