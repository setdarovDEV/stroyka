import '../styles/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { SmetaPage } from '@/pages/smeta';
import { WarehousePage } from '@/pages/warehouse';
import { M29Page } from '@/pages/m29';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="smeta" replace />} />
              <Route path="smeta" element={<SmetaPage />} />
              <Route path="warehouse" element={<WarehousePage />} />
              <Route path="m29" element={<M29Page />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
