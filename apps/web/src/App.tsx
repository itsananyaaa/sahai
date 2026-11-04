import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { CasesPage } from "./pages/CasesPage";
import { NewCasePage } from "./pages/NewCasePage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { MviWorkspacePage } from "./pages/MviWorkspacePage";
import { VisitWizardPage } from "./pages/VisitWizardPage";
import { EmergencyAlertPage } from "./pages/EmergencyAlertPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { NewReferralPage } from "./pages/NewReferralPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { NewFollowUpPage } from "./pages/NewFollowUpPage";
import { SyncCentrePage } from "./pages/SyncCentrePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
};

export const App: React.FC = () => {
  const { initSession } = useAuthStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes inside AppShell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/new"
          element={
            <ProtectedRoute>
              <NewCasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <ProtectedRoute>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId/mvi"
          element={
            <ProtectedRoute>
              <MviWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/new"
          element={
            <ProtectedRoute>
              <VisitWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency"
          element={
            <ProtectedRoute>
              <EmergencyAlertPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals/new"
          element={
            <ProtectedRoute>
              <NewReferralPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/follow-ups"
          element={
            <ProtectedRoute>
              <FollowUpsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/follow-ups/new"
          element={
            <ProtectedRoute>
              <NewFollowUpPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync"
          element={
            <ProtectedRoute>
              <SyncCentrePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
