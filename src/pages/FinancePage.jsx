import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [incomeForm, setIncomeForm] = useState({
    buildingId: '',
    category: 'RENT',
    amount: '',
    description: '',
    date: today,
    reference: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    buildingId: '',
    category: 'MAINTENANCE',
    amount: '',
    description: '',
    date: today,
    reference: '',
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings-list'],
    queryFn: async () => (await api.get('/tenant/buildings', { params: { limit: 100 } })).data.data,
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: async () => (await api.get('/tenant/finance/dashboard')).data.data,
  });

  const { data: income } = useQuery({
    queryKey: ['finance-income'],
    queryFn: async () => (await api.get('/tenant/finance/income', { params: { limit: 20 } })).data,
  });

  const { data: expenses } = useQuery({
    queryKey: ['finance-expenses'],
    queryFn: async () => (await api.get('/tenant/finance/expenses', { params: { limit: 20 } })).data,
  });

  const createIncomeMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/finance/income', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-income'] });
      setIncomeOpen(false);
      setIncomeForm({ buildingId: '', category: 'RENT', amount: '', description: '', date: today, reference: '' });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/finance/expenses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      setExpenseOpen(false);
      setExpenseForm({ buildingId: '', category: 'MAINTENANCE', amount: '', description: '', date: today, reference: '' });
    },
  });

  const handleIncomeSubmit = (e) => {
    e.preventDefault();
    createIncomeMutation.mutate({
      buildingId: incomeForm.buildingId || undefined,
      category: incomeForm.category,
      amount: Number(incomeForm.amount),
      description: incomeForm.description || undefined,
      date: new Date(incomeForm.date).toISOString(),
      reference: incomeForm.reference || undefined,
    });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    createExpenseMutation.mutate({
      buildingId: expenseForm.buildingId || undefined,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || undefined,
      date: new Date(expenseForm.date).toISOString(),
      reference: expenseForm.reference || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Income, expenses, and financial overview"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIncomeOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Add Income
            </Button>
            <Button onClick={() => setExpenseOpen(true)} variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>
        }
      />

      {dashLoading ? (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl glass-card animate-pulse shimmer-glass" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard title="Total Income" value={formatCurrency(dashboard?.totalIncome)} icon={TrendingUp} />
          <StatCard title="Total Expenses" value={formatCurrency(dashboard?.totalExpenses)} icon={TrendingDown} />
          <StatCard title="Profit" value={formatCurrency(dashboard?.profit)} />
          <StatCard title="Pending Rent" value={formatCurrency(dashboard?.pendingRent)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-blue-100/50 dark:border-blue-900/30">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Income</h3>
            <span className="text-xs text-emerald-600 font-medium">Credits</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(income?.data || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">No income records</TableCell>
                </TableRow>
              ) : (
                income.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-800 dark:text-white">{r.description || 'Income'}</TableCell>
                    <TableCell><span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{r.category}</span></TableCell>
                    <TableCell className="text-emerald-600 font-semibold">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-blue-100/50 dark:border-blue-900/30">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Expenses</h3>
            <span className="text-xs text-red-500 font-medium">Debits</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expenses?.data || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">No expense records</TableCell>
                </TableRow>
              ) : (
                expenses.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-800 dark:text-white">{r.description || 'Expense'}</TableCell>
                    <TableCell><span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{r.category}</span></TableCell>
                    <TableCell className="text-red-500 font-semibold">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Income Dialog */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Income</DialogTitle></DialogHeader>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Building (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                value={incomeForm.buildingId}
                onChange={(e) => setIncomeForm({ ...incomeForm, buildingId: e.target.value })}
              >
                <option value="">All / Common</option>
                {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  required
                >
                  {['RENT', 'DEPOSIT', 'AMENITY', 'LAUNDRY', 'PARKING', 'PENALTY', 'OTHER'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10000"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference / Mode</Label>
                <Input
                  placeholder="e.g. UPI / Cash / Ref#"
                  value={incomeForm.reference}
                  onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Deposit for room 101"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
              />
            </div>

            {createIncomeMutation.error && (
              <p className="text-sm text-red-500">{createIncomeMutation.error.response?.data?.message || 'Failed to record income'}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIncomeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createIncomeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createIncomeMutation.isPending ? 'Saving...' : 'Save Income'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Building (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                value={expenseForm.buildingId}
                onChange={(e) => setExpenseForm({ ...expenseForm, buildingId: e.target.value })}
              >
                <option value="">All / Common</option>
                {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  required
                >
                  {['MAINTENANCE', 'UTILITIES', 'SALARY', 'SUPPLIES', 'INTERNET', 'FOOD', 'CLEANING', 'TAX', 'RENT', 'OTHER'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 3500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference / Invoice#</Label>
                <Input
                  placeholder="e.g. Bill #1042"
                  value={expenseForm.reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Electricity bill for Block A"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>

            {createExpenseMutation.error && (
              <p className="text-sm text-red-500">{createExpenseMutation.error.response?.data?.message || 'Failed to record expense'}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpenseMutation.isPending} variant="destructive">
                {createExpenseMutation.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}