import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('pathprohori_token');
      if (token) {
        try {
          const { data } = await API.get('/auth/me');
          setUser(data);
        } catch (error) {
          console.error('Failed to load user token:', error);
          localStorage.removeItem('pathprohori_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('pathprohori_token', data.token);
    setUser(data);
    return data;
  };

  const register = async (userData) => {
    const { data } = await API.post('/auth/register', userData);
    localStorage.setItem('pathprohori_token', data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pathprohori_token');
    setUser(null);
  };

  const updateUserProfile = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
