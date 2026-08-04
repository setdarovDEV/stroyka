import '../styles/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { DashboardPage } from '@/pages/dashboard';
import { EstimatePage } from '@/pages/estimate';
import { WarehousePage } from '@/pages/warehouse';
import { BrigadesPage } from '@/pages/brigades';
import { ReportsPage } from '@/pages/reports';
import { UsersPage } from '@/pages/users';
import { ProjectsPage } from '@/pages/projects';
import { AlertsPage } from '@/pages/alerts';
import { SettingsPage } from '@/pages/settings';
import { MaterialRequestsPage } from '@/pages/material-requests';
import { ZonesPage } from '@/pages/zones';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="estimate" element={<EstimatePage />} />
              <Route path="warehouse" element={<WarehousePage />} />
              <Route path="brigades" element={<BrigadesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="material-requests" element={<MaterialRequestsPage />} />
              <Route path="zones" element={<ZonesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
