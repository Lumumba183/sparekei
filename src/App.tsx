import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';

// Public Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Dashboard Pages
import OwnerDashboard from '@/pages/dashboards/OwnerDashboard';
import MechanicDashboard from '@/pages/dashboards/MechanicDashboard';
import VendorDashboard from '@/pages/dashboards/VendorDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';

// Feature Pages
import MarketplacePage from '@/pages/MarketplacePage';
import ServicesPage from '@/pages/ServicesPage';
import EmergencyPage from '@/pages/EmergencyPage';
import VehiclePassportPage from '@/pages/VehiclePassportPage';
import PredictiveAlertsPage from '@/pages/PredictiveAlertsPage';
import AIConciergePage from '@/pages/AIConciergePage';

// Role Pages
import JobsPage from '@/pages/JobsPage';
import EarningsPage from '@/pages/EarningsPage';
import StorefrontPage from '@/pages/StorefrontPage';
import InventoryPage from '@/pages/InventoryPage';
import FleetPage from '@/pages/FleetPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import UsersPage from '@/pages/UsersPage';
import CitiesPage from '@/pages/CitiesPage';
import AdminCenterPage from '@/pages/AdminCenterPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';

import type { UserRole } from '@/types';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user!.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'owner': return <OwnerDashboard />;
    case 'mechanic': return <MechanicDashboard />;
    case 'vendor': return <VendorDashboard />;
    case 'admin': return <AdminDashboard />;
    default: return <OwnerDashboard />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Dashboard - Role-based */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
      
      {/* Feature Routes */}
      <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute allowedRoles={['owner', 'mechanic', 'fleet_manager']}><ServicesPage /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
      <Route path="/passport" element={<ProtectedRoute allowedRoles={['owner']}><VehiclePassportPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><PredictiveAlertsPage /></ProtectedRoute>} />
      <Route path="/ai-concierge" element={<ProtectedRoute><AIConciergePage /></ProtectedRoute>} />
      
      {/* Role Routes */}
      <Route path="/jobs" element={<ProtectedRoute allowedRoles={['mechanic', 'bodyshop', 'detailer', 'solo_workshop']}><JobsPage /></ProtectedRoute>} />
      <Route path="/earnings" element={<ProtectedRoute allowedRoles={['mechanic', 'vendor', 'bodyshop', 'detailer', 'solo_workshop']}><EarningsPage /></ProtectedRoute>} />
      <Route path="/storefront" element={<ProtectedRoute allowedRoles={['vendor']}><StorefrontPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute allowedRoles={['vendor', 'wholesaler']}><InventoryPage /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute allowedRoles={['fleet_manager', 'admin']}><FleetPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={['vendor', 'wholesaler', 'manufacturer', 'admin']}><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
      <Route path="/cities" element={<ProtectedRoute allowedRoles={['admin']}><CitiesPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminCenterPage /></ProtectedRoute>} />
      
      {/* Common Routes */}
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
