import { useEffect, useState } from 'react';
import ParentLogin from './ParentLogin';
import ParentApp from './ParentApp';
import { parentApi } from './api';
import type { ParentSession } from './types';

const STORAGE_KEY = 'kalvi_parent_session';

export default function ParentRoot() {
  const [session, setSession] = useState<ParentSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  const handleLogin = (s: ParentSession) => {
    setSession(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // storage unavailable — session still works for this tab
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSession(JSON.parse(raw));
        setLoaded(true);
        return;
      }
    } catch {
      // ignore corrupt/blocked storage
    }

    // A shared "?demo=1" link (e.g. dropped in a WhatsApp group) skips straight
    // into the preview account without anyone needing to tap the demo button.
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      parentApi.demoLogin()
        .then((data) => handleLogin({ phone: data.phone, students: data.students, isDemo: true }))
        .catch(() => {})
        .finally(() => setLoaded(true));
      return;
    }

    setLoaded(true);
  }, []);

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
