import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';
import { UIProvider } from './ui';
import DashboardLayout from './DashboardLayout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import PropertiesListPage from './pages/PropertiesListPage';
import PropertyFormPage from './pages/PropertyFormPage';
import CategoriesPage from './pages/CategoriesPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import SiteVisitsPage from './pages/SiteVisitsPage';
import LocationsPage from './pages/LocationsPage';
import SettingsPage from './pages/SettingsPage';
import './dashboard.css';

function DashboardNotFound() {
  return (
    <div className="dash-denied">
      <h2>Page not found</h2>
      <Link to="/dashboard" className="btn btn--navy">Back to dashboard</Link>
    </div>
  );
}

export default function DashboardApp() {
  return (
    <AuthProvider>
      <UIProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<OverviewPage />} />
            <Route path="properties" element={<PropertiesListPage />} />
            <Route path="properties/new" element={<PropertyFormPage />} />
            <Route path="properties/:id/edit" element={<PropertyFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="site-visits" element={<SiteVisitsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="settings" element={<ProtectedRoute permission="settings.manage"><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<DashboardNotFound />} />
          </Route>
        </Routes>
      </UIProvider>
    </AuthProvider>
  );
}
