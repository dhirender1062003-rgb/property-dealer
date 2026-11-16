import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import { Loader } from './components/StatusMessage';

// The staff dashboard is loaded only when someone opens /dashboard,
// so public visitors never download its code.
const DashboardApp = lazy(() => import('./dashboard/DashboardApp'));

export default function App() {
  return (
    <Routes>
      <Route
        path="dashboard/*"
        element={(
          <Suspense fallback={<Loader label="Loading dashboard…" />}>
            <DashboardApp />
          </Suspense>
        )}
      />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:slug" element={<PropertyDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
