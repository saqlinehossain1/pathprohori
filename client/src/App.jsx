import React, { useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { PageTransition } from './components/layout/PageTransition';
import { GuardianEmergencyModal } from './components/emergency/GuardianEmergencyModal';
import { GlobalVoiceAlarmModal } from './components/voice/GlobalVoiceAlarmModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LogJourney } from './pages/LogJourney';
import { LiveDangerFeed } from './pages/LiveDangerFeed';
import { IncidentDiscussion } from './pages/IncidentDiscussion';
import { VoiceSettings } from './pages/VoiceSettings';
import { ProfileSettings } from './pages/ProfileSettings';
import { Notifications } from './pages/Notifications';
import { PublicLiveTracking } from './pages/PublicLiveTracking';

export const App = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const isTrackingRoute = location.pathname.startsWith('/track/');

  if (isTrackingRoute) {
    return (
      <Routes>
        <Route path="/track/:token" element={<PublicLiveTracking />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-app-ambient text-slate-900 font-sans overflow-hidden">
      {user && <Header />}
      {user && (
        <ErrorBoundary>
          <GuardianEmergencyModal />
          <GlobalVoiceAlarmModal />
        </ErrorBoundary>
      )}

      <div className="flex-1 flex w-full overflow-hidden min-h-0 relative z-10">
        {user && <Sidebar />}

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <main className="app-main-content flex-1 min-w-0 overflow-y-auto bg-transparent px-3 pt-3 pb-36 sm:px-6 sm:pt-6 sm:pb-32 md:p-8 md:pb-16 custom-scrollbar">
            <PageTransition>
              <Routes>
                <Route path="/track/:token" element={<PublicLiveTracking />} />
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
                <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/log-journey"
                  element={
                    <ProtectedRoute>
                      <LogJourney />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-danger-feed"
                  element={
                    <ProtectedRoute>
                      <LiveDangerFeed />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/incident/:id"
                  element={
                    <ProtectedRoute>
                      <IncidentDiscussion />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voice-settings"
                  element={
                    <ProtectedRoute>
                      <VoiceSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PageTransition>
          </main>

          <Footer />
        </div>
      </div>

      {user && <MobileBottomNav />}
    </div>
  );
};

export default App;
