import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// Routes available to a platform super admin.
function PlatformRoutes() {
  return (
    <Route element={<DashboardLayout />}>
      <Route index element={<PlatformDashboardPage />} />
      <Route path="tenants" element={<PlatformTenantsPage />} />
      <Route path="billing" element={<PlatformBillingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  );
}

// Routes available to a tenant user (PG admin / staff).
function TenantRoutes() {
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
      <Route path="complaints" element={<ComplaintsPage />} />
      <Route path="staff" element={<StaffPage />} />
      <Route path="finance" element={<FinancePage />} />
      <Route path="visitors" element={<VisitorsPage />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="maintenance" element={<MaintenancePage />} />
      <Route path="documents" element={<DocumentsPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="payment-settings" element={<PaymentSettingsPage />} />
      <Route path="discounts" element={<DiscountsPage />} />
      <Route path="promotions" element={<PromotionsPage />} />
      <Route path="food-menu" element={<FoodMenuPage />} />
      <Route path="roles" element={<RolesPage />} />
    </Route>
  );
}

function AppRoutes() {
  const scope = useAuthStore((s) => s.user?.scope);
  const isPlatform = scope === 'PLATFORM';

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        {isPlatform ? PlatformRoutes() : TenantRoutes()}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
