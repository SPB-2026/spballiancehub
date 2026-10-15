import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [booting, setBooting] = useState(true);
  const [memberVerified, setMemberVerified] = useState(false);
  const [memberName, setMemberName] = useState('');

  const refresh = useCallback(async () => {
    try {
      const pub = await api.get('/settings/public');
      setSettings(pub);
    } catch {
      /* ignore — settings fetch failure should not block the app */
    }
  }, []);

  const refreshAccessStatus = useCallback(async () => {
    try {
      const status = await api.get('/access/status');
      setMemberVerified(Boolean(status.verified));
      setMemberName(status.name || '');
    } catch {
      setMemberVerified(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([refresh(), refreshAccessStatus()]).finally(() => setBooting(false));
  }, [refresh, refreshAccessStatus]);

  // The one-time Game ID popup after the magic link — see access.service.js
  // on the backend. Throws on an invalid/expired link or unrecognized ID so
  // the gate component can show the error.
  const verifyMember = useCallback(async (gameUserId, token) => {
    const result = await api.post('/access/verify', { game_user_id: gameUserId, token });
    setMemberVerified(true);
    setMemberName(result.name || '');
    return result;
  }, []);

  // No admin login — direct access via /spballiancehubadministrator2026
  const user = null;
  const isAdmin = false;
  const loginAdmin = async () => { throw new Error('Admin login removed — use direct admin URL'); };
  const logout = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user, settings, booting, isAdmin, refresh, loginAdmin, logout, setSettings,
        memberVerified, memberName, verifyMember, refreshAccessStatus,
      }}
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
