import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRightLeft, Boxes, Download, Layers, Plus, QrCode, RotateCcw, Search, Wallet, Wrench } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CodeChip, ErrorText, NativeSelect, Pagination, TabBar, downloadBlob, personName, roomLabel,
  useBuildings, useInventoryCategories, label,
} from '@/components/inventory/common';
import ItemFormDialog from '@/components/inventory/ItemFormDialog';
import BulkCreateDialog from '@/components/inventory/BulkCreateDialog';
import TransferDialog from '@/components/inventory/TransferDialog';
import ItemDetailDialog from '@/components/inventory/ItemDetailDialog';
import { RestoreDialog } from '@/components/inventory/ItemActions';
import AlertsTab from '@/components/inventory/AlertsTab';
import ServiceLogsTab from '@/components/inventory/ServiceLogsTab';
import AuditsTab from '@/components/inventory/AuditsTab';

const INITIAL_FILTERS = { category: '', status: '', condition: '', attention: '', sort: 'createdAt:desc' };

const ATTENTION_PARAMS = {
  warrantyExpiring: { warrantyExpiringInDays: 30 },
  warrantyExpired: { warrantyExpired: true },
  serviceDue: { serviceDue: true },
  unassigned: { unassigned: true },
};

function buildParams(filters, search, buildingId) {
  const params = {};
  if (search) params.search = search;
  if (buildingId) params.buildingId = buildingId;
  if (filters.category) params.category = filters.category;
  if (filters.condition) params.condition = filters.condition;
  if (filters.status === '__ALL') params.includeDisposed = true;
  else if (filters.status === '__DELETED') params.onlyDeleted = true;
  else if (filters.status) params.status = filters.status;
  Object.assign(params, ATTENTION_PARAMS[filters.attention] || {});
  const [sortBy, sortOrder] = filters.sort.split(':');
  params.sortBy = sortBy;
  params.sortOrder = sortOrder;
  return params;
}

export default function InventoryPage() {
  const [tab, setTab] = useState('items');
  const [buildingId, setBuildingId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [restoreItem, setRestoreItem] = useState(null);
  const [codeInput, setCodeInput] = useState('');

  const { data: buildings } = useBuildings();
  const { data: categories } = useInventoryCategories();

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => buildParams(filters, search, buildingId), [filters, search, buildingId]);
  const deletedView = filters.status === '__DELETED';

  useEffect(() => { setPage(1); setSelected(new Set()); }, [params]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', params, page],
    queryFn: async () => (await api.get('/tenant/inventory', { params: { ...params, page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
    enabled: tab === 'items',
  });
  const items = data?.data || [];
  const pagination = data?.meta?.pagination;

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary', buildingId],
    queryFn: async () => (await api.get('/tenant/inventory/summary', { params: buildingId ? { buildingId } : {} })).data.data,
  });
  const att = summary?.attention || {};
  const attentionTotal = (att.warrantyExpiringIn30Days || 0) + (att.warrantyExpired || 0) + (att.serviceDue || 0) + (att.lost || 0);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { page: _p, limit: _l, ...rest } = params;
      const res = await api.get('/tenant/inventory/export', { params: rest, responseType: 'blob' });
      downloadBlob(res.data, `inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    },
  });

  const findByCode = useMutation({
    mutationFn: async (code) => (await api.get(`/tenant/inventory/by-code/${encodeURIComponent(code)}`)).data.data,
    onSuccess: (item) => { setDetailId(item.id); setCodeInput(''); },
  });

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const applyAttention = (attention) => { setTab('items'); setFilters({ ...INITIAL_FILTERS, attention }); setSearchInput(''); };
  const applyStatus = (status) => { setTab('items'); setFilters({ ...INITIAL_FILTERS, status }); setSearchInput(''); };

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const selectedIds = [...selected];
  const movable = (i) => !['DISPOSED', 'LOST'].includes(i.status);
  const selectedMovable = items.filter((i) => selected.has(i.id) && movable(i));

  const openItem = (id) => id && setDetailId(id);
  const val = summary?.valuation || {};

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Asset register: lifecycle, QR, repairs, audits and valuation"
        actions={
          <>
            <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4" /> {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Layers className="h-4 w-4" /> Bulk Add</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Item</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assets" value={summary?.totalItems ?? '-'} subtitle={`${summary?.byCategory?.length || 0} categories`} icon={Boxes} />
        <StatCard title="Current Value" value={formatCurrency(val.totalCurrentValue)} subtitle={`Purchased ${formatCurrency(val.totalPurchaseValue)} · Depreciation ${formatCurrency(val.totalDepreciation)}`} icon={Wallet} />
        <StatCard title="Repairs" value={att.openServiceLogs ?? '-'} subtitle={`${att.underRepair || 0} under repair · ${formatCurrency(summary?.repairSpendThisYear)} spent this year`} icon={Wrench} />
        <StatCard title="Needs Attention" value={summary ? attentionTotal : '-'} subtitle={`${att.lost || 0} lost · ${att.unassigned || 0} unassigned`} icon={AlertTriangle} />
      </div>

      {summary && (att.warrantyExpiringIn30Days || att.warrantyExpired || att.serviceDue || att.lost) ? (
        <div className="flex flex-wrap gap-2 mb-6">
          {att.warrantyExpiringIn30Days > 0 && <Button size="sm" variant="outline" onClick={() => applyAttention('warrantyExpiring')}>{att.warrantyExpiringIn30Days} warranty expiring in 30 days</Button>}
          {att.warrantyExpired > 0 && <Button size="sm" variant="outline" onClick={() => applyAttention('warrantyExpired')}>{att.warrantyExpired} warranty expired</Button>}
          {att.serviceDue > 0 && <Button size="sm" variant="outline" onClick={() => applyAttention('serviceDue')}>{att.serviceDue} service due</Button>}
          {att.lost > 0 && <Button size="sm" variant="outline" onClick={() => applyStatus('LOST')}>{att.lost} lost</Button>}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <TabBar
          tabs={[
            { value: 'items', label: 'Items' },
            { value: 'alerts', label: 'Alerts', count: attentionTotal + (att.openServiceLogs || 0) },
            { value: 'service', label: 'Service Logs' },
            { value: 'audits', label: 'Audits' },
          ]}
          value={tab} onChange={setTab}
        />
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); if (codeInput.trim()) findByCode.mutate(codeInput.trim()); }}
          >
            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input className="pl-9 w-52" placeholder="Scan / enter item code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" disabled={findByCode.isPending || !codeInput.trim()}>Find</Button>
          </form>
          <NativeSelect className="w-48" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} aria-label="Building">
            <option value="">All buildings</option>
            {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </NativeSelect>
        </div>
      </div>
      {findByCode.error && <div className="mb-3"><ErrorText error={findByCode.error} /></div>}
      {exportMutation.error && <div className="mb-3"><ErrorText error={exportMutation.error} /></div>}

      {tab === 'items' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[14rem] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search name, code, brand, serial..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <NativeSelect className="w-40" value={filters.category} onChange={setFilter('category')} aria-label="Category">
              <option value="">All categories</option>
              {(categories || []).map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
            </NativeSelect>
            <NativeSelect className="w-40" value={filters.status} onChange={setFilter('status')} aria-label="Status">
              <option value="">Active items</option>
              {['IN_USE', 'IN_STORAGE', 'UNDER_REPAIR', 'LOST', 'DISPOSED'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
              <option value="__ALL">All incl. disposed</option>
              <option value="__DELETED">Deleted</option>
            </NativeSelect>
            <NativeSelect className="w-36" value={filters.condition} onChange={setFilter('condition')} aria-label="Condition">
              <option value="">Any condition</option>
              {['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'DISPOSED'].map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
            <NativeSelect className="w-48" value={filters.attention} onChange={setFilter('attention')} aria-label="Attention">
              <option value="">No attention filter</option>
              <option value="warrantyExpiring">Warranty expiring (30d)</option>
              <option value="warrantyExpired">Warranty expired</option>
              <option value="serviceDue">Service due</option>
              <option value="unassigned">Unassigned</option>
            </NativeSelect>
            <NativeSelect className="w-44" value={filters.sort} onChange={setFilter('sort')} aria-label="Sort">
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="name:asc">Name A-Z</option>
              <option value="purchasePrice:desc">Price high-low</option>
              <option value="warrantyUntil:asc">Warranty ending soon</option>
              <option value="nextServiceDate:asc">Service due soon</option>
            </NativeSelect>
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-900/20 px-4 py-2.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedIds.length} selected</span>
              <Button size="sm" disabled={!selectedMovable.length} onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4" /> Transfer {selectedMovable.length !== selectedIds.length ? `(${selectedMovable.length})` : ''}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          <ErrorText error={error} />
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {!deletedView && <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />}
                  </TableHead>
                  <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead><TableHead>Assigned To</TableHead><TableHead>Value</TableHead><TableHead>Warranty</TableHead>
                  {deletedView && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
                  : items.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">No inventory items</TableCell></TableRow>
                  : items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={deletedView ? '' : 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20'}
                      onClick={() => !deletedView && openItem(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!deletedView && <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} />}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-800 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category}{item.brand ? ` · ${item.brand}` : ''}</p>
                      </TableCell>
                      <TableCell><CodeChip>{deletedView ? item.uniqueCode.split('~DEL~')[0] : item.uniqueCode}</CodeChip></TableCell>
                      <TableCell>
                        <p>{item.building?.name || '-'}</p>
                        <p className="text-xs text-slate-500">{item.room ? roomLabel(item.room) : 'Storage'}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell><StatusBadge status={item.condition} /></TableCell>
                      <TableCell>{personName(item.assignedResident) || '-'}</TableCell>
                      <TableCell>
                        <p>{item.valuation?.currentValue != null ? formatCurrency(item.valuation.currentValue) : '-'}</p>
                        {item.purchasePrice != null && item.valuation?.currentValue !== Number(item.purchasePrice) && (
                          <p className="text-xs text-slate-500">of {formatCurrency(item.purchasePrice)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.warrantyUntil ? (
                          <div>
                            <p className="text-sm">{formatDate(item.warrantyUntil)}</p>
                            {['EXPIRED', 'EXPIRING_SOON'].includes(item.valuation?.warrantyStatus) && <StatusBadge status={item.valuation.warrantyStatus} />}
                          </div>
                        ) : '-'}
                      </TableCell>
                      {deletedView && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => setRestoreItem(item)}><RotateCcw className="h-4 w-4" /> Restore</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <Pagination pagination={pagination} onPage={setPage} />
          </div>
        </>
      )}

      {tab === 'alerts' && <AlertsTab buildingId={buildingId} onOpenItem={openItem} />}
      {tab === 'service' && <ServiceLogsTab buildingId={buildingId} onOpenItem={openItem} />}
      {tab === 'audits' && <AuditsTab buildingId={buildingId} />}

      <ItemFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(item) => item?.id && setDetailId(item.id)} />
      <BulkCreateDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <TransferDialog
        open={transferOpen} onOpenChange={setTransferOpen}
        itemIds={selectedMovable.map((i) => i.id)}
        onDone={() => setSelected(new Set())}
      />
      <RestoreDialog open={!!restoreItem} onOpenChange={(v) => !v && setRestoreItem(null)} item={restoreItem} />
      <ItemDetailDialog itemId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
