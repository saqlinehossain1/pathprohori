import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LogJourney } from './pages/LogJourney';
import { LiveDangerFeed } from './pages/LiveDangerFeed';
import { IncidentDiscussion } from './pages/IncidentDiscussion';
import { VoiceSettings } from './pages/VoiceSettings';

export const App = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8FA] text-[#2D2329] font-sans">
      {user && <Header />}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {user && <Sidebar />}

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default App;
