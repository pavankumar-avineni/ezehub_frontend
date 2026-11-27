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
import { useIsSuperAdmin } from '@/hooks/useFeature';

export default function PlatformTenantDetailPage() {
  const { id } = useParams();
  const canEdit = useIsSuperAdmin();
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const tenant = useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: async () => (await api.get(`/platform/tenants/${id}`)).data.data,
  });
  const pricing = useQuery({
    queryKey: ['admin-pricing', id],
    queryFn: async () => (await api.get(`/subscription/admin/${id}/pricing`)).data.data,
  });
  const features = useQuery({
    queryKey: ['admin-tenant-features', id],
    queryFn: async () => (await api.get(`/subscription/admin/${id}/features`)).data.data,
  });

  const t = tenant.data;
  return (
    <div>
      <Link to="/tenants" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to tenants</Link>
      <PageHeader
        title={t?.name || 'Tenant'}
        description={t ? `${t.email}${t.phone ? ` · ${t.phone}` : ''}` : ''}
        actions={t && <StatusBadge status={t.status} />}
      />
      <div className="mb-4"><ReadOnlyNote show={!canEdit} /></div>
      <ErrorText error={tenant.error || pricing.error || features.error} />

      <div className="space-y-6">
        {pricing.isLoading ? <p className="text-center py-8 text-slate-400">Loading pricing...</p> : pricing.data && (
          <TenantPricingCard tenantId={id} pricing={pricing.data} canEdit={canEdit} onGenerate={() => setInvoiceOpen(true)} />
        )}
        {features.isLoading ? <p className="text-center py-8 text-slate-400">Loading features...</p> : features.data && (
          <TenantFeaturesCard tenantId={id} view={features.data} canEdit={canEdit} />
        )}
      </div>

      <GenerateInvoiceDialog tenantId={id} open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    </div>
  );
}
