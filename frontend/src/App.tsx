import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage }))
);
const ValidationsPage = lazy(() =>
  import('./pages/ValidationsPage').then((module) => ({ default: module.ValidationsPage }))
);
const FinancePage = lazy(() =>
  import('./pages/FinancePage').then((module) => ({ default: module.FinancePage }))
);
const FieldReportsPage = lazy(() =>
  import('./pages/FieldReportsPage').then((module) => ({ default: module.FieldReportsPage }))
);
const AuditPage = lazy(() =>
  import('./pages/AuditPage').then((module) => ({ default: module.AuditPage }))
);
const MapPage = lazy(() =>
  import('./pages/MapPage').then((module) => ({ default: module.MapPage }))
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isOfflineSession } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Chargement du contexte régalien SIPAT...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isOfflineSession && location.pathname !== '/field-reports') {
    return <Navigate to="/field-reports" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
              Chargement du module SIPAT...
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="validations" element={<ValidationsPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="field-reports" element={<FieldReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};
