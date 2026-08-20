import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LogJourney } from './pages/LogJourney';
import { LiveDangerFeed } from './pages/LiveDangerFeed';
import { IncidentDiscussion } from './pages/IncidentDiscussion';
import { VoiceSettings } from './pages/VoiceSettings';
import { ProfileSettings } from './pages/ProfileSettings';
import { Notifications } from './pages/Notifications';

export const App = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="h-screen flex flex-col bg-app-texture text-[#2D2329] font-sans overflow-hidden">
      {user && <Header />}

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden min-h-0">
        {user && <Sidebar />}

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-12 overflow-y-auto min-h-0">
          <Routes>
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
        </main>
      </div>

      {user && <MobileBottomNav />}
      <Footer />
    </div>
  );
};

export default App;
