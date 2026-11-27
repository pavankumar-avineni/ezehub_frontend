import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { ErrorText } from '@/components/inventory/common';
import { ReadOnlyNote } from '@/components/billing/shared';
import TenantPricingCard from '@/components/billing/TenantPricingCard';
import TenantFeaturesCard from '@/components/billing/TenantFeaturesCard';
import GenerateInvoiceDialog from '@/components/billing/GenerateInvoiceDialog';
import OwnerCard from '@/components/team/OwnerCard';
import { NoAccessPage } from '@/components/team/common';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';

export const TENANT_NO_ACCESS = 'Tenant not found or not assigned to you.';

export default function PlatformTenantDetailPage() {
  const { id } = useParams();
  const { can } = useCan();
  const canBilling = can(PERM.BILLING_READ);
  const canPricing = can(PERM.PRICING_MANAGE);
  const canInvoice = can(PERM.BILLING_MANAGE);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const tenant = useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: async () => (await api.get(`/platform/tenants/${id}`)).data.data,
    retry: false, // a 404 means "no access", never retry it
  });
  const pricing = useQuery({
    queryKey: ['admin-pricing', id],
    queryFn: async () => (await api.get(`/subscription/admin/${id}/pricing`)).data.data,
    enabled: canBilling && tenant.isSuccess,
    retry: false,
  });
  const features = useQuery({
    queryKey: ['admin-tenant-features', id],
    queryFn: async () => (await api.get(`/subscription/admin/${id}/features`)).data.data,
    enabled: canBilling && tenant.isSuccess,
    retry: false,
  });

  if (tenant.error?.response?.status === 404) return <NoAccessPage message={TENANT_NO_ACCESS} />;
  const t = tenant.data;

  return (
    <div>
      <Link to="/tenants" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to tenants</Link>
      <PageHeader
        title={t?.name || 'Tenant'}
        description={t ? `${t.email}${t.phone ? ` · ${t.phone}` : ''}` : ''}
        actions={t && <StatusBadge status={t.status} />}
      />
      {canBilling && <div className="mb-4"><ReadOnlyNote show={!canPricing && !canInvoice} /></div>}
      <ErrorText error={tenant.error || pricing.error || features.error} />

      <div className="space-y-6">
        {tenant.isLoading && <p className="text-center py-8 text-slate-400">Loading...</p>}
        {t && <OwnerCard tenant={t} />}
        {canBilling && (pricing.isLoading ? <p className="text-center py-8 text-slate-400">Loading pricing...</p> : pricing.data && (
          <TenantPricingCard tenantId={id} pricing={pricing.data} canEdit={canPricing} canGenerate={canInvoice} onGenerate={() => setInvoiceOpen(true)} />
        ))}
        {canBilling && (features.isLoading ? <p className="text-center py-8 text-slate-400">Loading features...</p> : features.data && (
          <TenantFeaturesCard tenantId={id} view={features.data} canEdit={canPricing} />
        ))}
      </div>

      {canInvoice && <GenerateInvoiceDialog tenantId={id} open={invoiceOpen} onOpenChange={setInvoiceOpen} />}
    </div>
  );
}
