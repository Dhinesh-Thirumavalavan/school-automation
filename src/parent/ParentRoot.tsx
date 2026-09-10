import { useEffect, useState } from 'react';
import ParentLogin from './ParentLogin';
import ParentApp from './ParentApp';
import type { ParentSession } from './types';

const STORAGE_KEY = 'kalvi_parent_session';

export default function ParentRoot() {
  const [session, setSession] = useState<ParentSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // ignore corrupt/blocked storage
    }
    setLoaded(true);
  }, []);

  const handleLogin = (s: ParentSession) => {
    setSession(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // storage unavailable — session still works for this tab
    }
  };

  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (!loaded) return null;

  return session ? <ParentApp session={session} onLogout={handleLogout} /> : <ParentLogin onLogin={handleLogin} />;
}
