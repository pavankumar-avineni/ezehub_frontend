import { Check, Lock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { formatFeaturePrice, formatINR, isCoreFeature } from '@/lib/features';
import { SectionTitle } from '@/components/inventory/common';

/** Group features by `group`, keeping the order the API returned them in. */
export function groupFeatures(features) {
  const map = new Map();
  (features || []).forEach((f) => {
    const g = f.group || 'Other';
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(f);
  });
  return [...map.entries()];
}

/** Toggle an add-on in a selection, honouring `requires` in both directions. */
export function toggleAddOn(selected, code, features) {
  const set = new Set(selected);
  const byCode = new Map((features || []).map((f) => [f.code, f]));
  if (set.has(code)) {
    set.delete(code);
    // Anything that requires this feature has to go too.
    let changed = true;
    while (changed) {
      changed = false;
      (features || []).forEach((f) => {
        if (set.has(f.code) && (f.requires || []).some((r) => !set.has(r) && !isCoreFeature(r))) {
          set.delete(f.code);
          changed = true;
        }
      });
    }
  } else {
    const add = (c) => {
      if (set.has(c) || isCoreFeature(c)) return;
      set.add(c);
      (byCode.get(c)?.requires || []).forEach(add);
    };
    add(code);
  }
  return [...set];
}

/** Which selected features are missing a required feature? */
export function dependencyProblems(selected, features) {
  const set = new Set(selected);
  const out = [];
  (features || []).forEach((f) => {
    if (set.has(f.code)) (f.requires || []).forEach((r) => { if (!isCoreFeature(r) && !set.has(r)) out.push(`${f.name} requires ${r}`); });
  });
  return out;
}

/**
 * Grouped checklist. Core features are shown as "always included".
 * `features` = catalog (public or admin). `selected` = add-on codes.
 */
export function FeatureChecklist({ features, selected, onChange, disabled }) {
  const groups = groupFeatures(features);
  const set = new Set(selected);
  return (
    <div className="space-y-4">
      {groups.map(([group, list]) => (
        <div key={group}>
          <SectionTitle className="mb-2">{group}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {list.map((f) => {
              const core = f.isCore || isCoreFeature(f.code);
              const retired = !core && f.isActive === false && !set.has(f.code);
              return (
                <label
                  key={f.code}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${core ? 'border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-900/10' : 'border-blue-100/70 dark:border-blue-900/30'} ${retired ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  {core ? (
                    <Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                  ) : (
                    <input
                      type="checkbox" className="mt-1" checked={set.has(f.code)} disabled={disabled || retired}
                      onChange={() => onChange(toggleAddOn(selected, f.code, features))}
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800 dark:text-white">{f.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {core ? 'Always included' : formatFeaturePrice(f.price, f.priceType)}
                      {retired && ' · not available'}
                      {(f.requires || []).length > 0 && ` · requires ${f.requires.join(', ')}`}
                    </span>
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

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Invoice / estimate lines + totals. Works for invoice.lineItems and estimatedNextInvoice.lines. */
export function LineItemsTable({ lines, amount, tax, taxPercent, total }) {
  return (
    <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 overflow-hidden text-sm">
      <div className="divide-y divide-blue-100/50 dark:divide-blue-900/30">
        {(lines || []).map((l, i) => (
          <div key={`${l.code}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-800 dark:text-white truncate">{l.name}</p>
              <p className="text-xs text-slate-500">
                {l.type === 'BEDS' || l.priceType === 'PER_BED'
                  ? `${num(l.quantity)} beds × ${formatINR(l.unitPrice)}`
                  : `${formatINR(l.unitPrice)} flat`}
              </p>
            </div>
            <span className="font-semibold text-slate-800 dark:text-white shrink-0">{formatINR(l.amount)}</span>
          </div>
        ))}
        {(!lines || lines.length === 0) && <p className="px-3 py-3 text-slate-400 text-center">No line items</p>}
      </div>
      <div className="bg-blue-50/40 dark:bg-slate-800/40 px-3 py-2 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(amount)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Tax ({num(taxPercent)}%)</span><span>{formatINR(tax)}</span></div>
        <div className="flex justify-between font-bold text-slate-800 dark:text-white"><span>Total</span><span>{formatINR(total)}</span></div>
      </div>
    </div>
  );
}

/** Expanded content for one invoice row (new line-item invoices and legacy ones). */
export function InvoiceDetail({ invoice }) {
  if (!invoice.lineItems?.length) {
    return (
      <div className="text-sm space-y-1">
        <p className="text-slate-500">Legacy invoice{invoice.legacyPlan ? ` — ${invoice.legacyPlan} plan` : ''}. Line items are not available.</p>
        <p className="font-semibold text-slate-800 dark:text-white">Total: {formatINR(invoice.total)}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        {num(invoice.bedCount)} beds at {formatINR(invoice.ratePerBed)} per bed · Period {formatDate(invoice.billingStart)} to {formatDate(invoice.billingEnd)}
      </p>
      <LineItemsTable lines={invoice.lineItems} amount={invoice.amount} tax={invoice.tax} taxPercent={invoice.taxPercent} total={invoice.total} />
    </div>
  );
}

export function RateBadge({ custom }) {
  return custom
    ? <span className="inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600">Custom</span>
    : null;
}

export function TrialText({ billing }) {
  if (!billing?.isTrial) return billing?.trialEndsAt ? <span className="text-xs text-slate-500">Trial ended</span> : <span className="text-xs text-slate-400">-</span>;
  return <span className="text-xs font-medium text-violet-600 dark:text-violet-300">Trial: {billing.trialDaysLeft} days left</span>;
}

export function ReadOnlyNote({ show }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <Lock className="h-3.5 w-3.5" /> View-only access. Only a super admin can make changes.
    </p>
  );
}

export { StatusBadge };
