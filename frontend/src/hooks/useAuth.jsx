import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const pub = await api.get('/settings/public');
      setSettings(pub);
    } catch {
      /* ignore — settings fetch failure should not block the app */
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setBooting(false));
  }, [refresh]);

  // No admin login — direct access via /spballiancehubadministrator2026
  const user = null;
  const isAdmin = false;
  const loginAdmin = async () => { throw new Error('Admin login removed — use direct admin URL'); };
  const logout = async () => {};

  return (
    <AuthContext.Provider
      value={{ user, settings, booting, isAdmin, refresh, loginAdmin, logout, setSettings }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
