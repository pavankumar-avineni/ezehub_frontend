import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FeatureRoute, PermissionRoute } from '@/components/shared/FeatureGate';
import { LockedFeatureModal } from '@/components/shared/LockedFeature';
import { FEATURE, ROLES_PERMISSION } from '@/lib/features';
import { refreshEnabledFeatures } from '@/lib/api';
import PricingPage from '@/pages/PricingPage';
import { ProtectedRoute, PublicRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import LoginPage from '@/pages/LoginPage';

// Tenant pages
import DashboardPage from '@/pages/DashboardPage';
import ResidentsPage from '@/pages/ResidentsPage';
import PropertyPage from '@/pages/PropertyPage';
import RentPage from '@/pages/RentPage';
import ComplaintsPage from '@/pages/ComplaintsPage';
import StaffPage from '@/pages/StaffPage';
import FinancePage from '@/pages/FinancePage';
import VisitorsPage from '@/pages/VisitorsPage';
import InventoryPage from '@/pages/InventoryPage';
import MaintenancePage from '@/pages/MaintenancePage';
import DocumentsPage from '@/pages/DocumentsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import PaymentSettingsPage from '@/pages/PaymentSettingsPage';
import DiscountsPage from '@/pages/DiscountsPage';
import PromotionsPage from '@/pages/PromotionsPage';
import FoodMenuPage from '@/pages/FoodMenuPage';
import RolesPage from '@/pages/RolesPage';
import BedMapPage from '@/pages/BedMapPage';

// Platform (super admin) pages
import PlatformDashboardPage from '@/pages/PlatformDashboardPage';
import PlatformTenantsPage from '@/pages/PlatformTenantsPage';
import PlatformBillingPage from '@/pages/PlatformBillingPage';
import PlatformTenantDetailPage from '@/pages/PlatformTenantDetailPage';
import PlatformSettingsPage from '@/pages/PlatformSettingsPage';
import PlatformFeaturesPage from '@/pages/PlatformFeaturesPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// Routes available to a platform super admin.
function PlatformRoutes() {
  return (
    <Route element={<DashboardLayout />}>
      <Route index element={<PlatformDashboardPage />} />
      <Route path="tenants" element={<PlatformTenantsPage />} />
      <Route path="tenants/:id" element={<PlatformTenantDetailPage />} />
      <Route path="billing" element={<PlatformBillingPage />} />
      <Route path="billing-settings" element={<PlatformSettingsPage />} />
      <Route path="features" element={<PlatformFeaturesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  );
}

// Routes available to a tenant user (PG admin / staff).
function TenantRoutes({ hasRoles }) {
  return (
    <Route element={<DashboardLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="residents" element={<ResidentsPage />} />
      <Route path="property" element={<PropertyPage />} />
      <Route path="buildings" element={<PropertyPage />} />
      <Route path="floors" element={<PropertyPage />} />
      <Route path="rooms" element={<PropertyPage />} />
      <Route path="beds" element={<PropertyPage />} />
      <Route path="bed-map" element={<BedMapPage />} />
      <Route path="rent" element={<RentPage />} />
      <Route path="complaints" element={<FeatureRoute code={FEATURE.COMPLAINTS}><ComplaintsPage /></FeatureRoute>} />
      <Route path="staff" element={<FeatureRoute code={FEATURE.STAFF}><StaffPage /></FeatureRoute>} />
      <Route path="finance" element={<FeatureRoute code={FEATURE.FINANCE}><FinancePage /></FeatureRoute>} />
      <Route path="visitors" element={<FeatureRoute code={FEATURE.VISITORS}><VisitorsPage /></FeatureRoute>} />
      <Route path="inventory" element={<FeatureRoute code={FEATURE.INVENTORY}><InventoryPage /></FeatureRoute>} />
      <Route path="maintenance" element={<FeatureRoute code={FEATURE.MAINTENANCE}><MaintenancePage /></FeatureRoute>} />
      <Route path="documents" element={<FeatureRoute code={FEATURE.DOCUMENTS}><DocumentsPage /></FeatureRoute>} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="payment-settings" element={<PaymentSettingsPage />} />
      <Route path="discounts" element={<FeatureRoute code={FEATURE.DISCOUNTS}><DiscountsPage /></FeatureRoute>} />
      <Route path="promotions" element={<FeatureRoute code={FEATURE.PROMOTIONS}><PromotionsPage /></FeatureRoute>} />
      <Route path="food-menu" element={<FeatureRoute code={FEATURE.FOOD_MENU}><FoodMenuPage /></FeatureRoute>} />
      <Route path="roles" element={<PermissionRoute allowed={hasRoles}><RolesPage /></PermissionRoute>} />
    </Route>
  );
}

function AppRoutes() {
  const scope = useAuthStore((s) => s.user?.scope);
  const isPlatform = scope === 'PLATFORM';
  const hasRoles = useAuthStore((s) => (s.user?.permissions || []).includes(ROLES_PERMISSION));
  const token = useAuthStore((s) => s.accessToken);

  // Refresh the enabled feature list on app start (tenant users).
  useEffect(() => { if (token && !isPlatform) refreshEnabledFeatures(); }, [token, isPlatform]);

  return (
    <Routes>
      <Route path="/pricing" element={<PricingPage />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        {isPlatform ? PlatformRoutes() : TenantRoutes({ hasRoles })}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Locked Feature modal for any FEATURE_NOT_ENABLED response (tenant users only).
function GlobalFeatureModal() {
  const scope = useAuthStore((s) => s.user?.scope);
  return scope && scope !== 'PLATFORM' ? <LockedFeatureModal /> : null;
}

export default function App() {
  // Check session on page load — auto-logout after 12h
  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <GlobalFeatureModal />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
