import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { PageTransition } from './components/layout/PageTransition';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LogJourney } from './pages/LogJourney';
import { LiveDangerFeed } from './pages/LiveDangerFeed';
import { IncidentDiscussion } from './pages/IncidentDiscussion';
import { VoiceSettings } from './pages/VoiceSettings';
import { ProfileSettings } from './pages/ProfileSettings';

export const App = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="h-screen flex flex-col bg-app-texture text-[#2D2329] font-sans overflow-hidden relative">
      {/* Ambient Decorative Glow Lights for Soft Floral Feminine Visual Depth */}
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-rose-400/15 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed -bottom-24 -left-24 w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-300/10 rounded-full blur-3xl pointer-events-none z-0" />

      {user && <Header />}

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden min-h-0 relative z-10">
        {user && <Sidebar />}

        <main className="flex-1 p-4 md:p-6 pb-28 md:pb-12 overflow-y-auto min-h-0">
          <PageTransition>
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
      </div>

      {user && <MobileBottomNav />}
      <Footer />
    </div>
  );
};

export default App;
