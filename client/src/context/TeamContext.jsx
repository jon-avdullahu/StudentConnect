import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { fetchMyTeam } from '../api';

const TeamContext = createContext({
  team: null,
  loading: true,
  refresh: async () => {},
});

export function TeamProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('user');
      if (!token || !raw) {
        setTeam(null);
        return;
      }
      let role = '';
      try {
        role = String(JSON.parse(raw).role || '').toLowerCase();
      } catch {
        setTeam(null);
        return;
      }
      if (role !== 'student') {
        setTeam(null);
        return;
      }
      const data = await fetchMyTeam();
      setTeam(data?.team ?? null);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      refresh();
    };
    const id = setInterval(tick, 12000);
    const onTeam = () => refresh();
    const onAuth = () => refresh();
    window.addEventListener('studentconnect-team', onTeam);
    window.addEventListener('studentconnect-auth', onAuth);
    return () => {
      clearInterval(id);
      window.removeEventListener('studentconnect-team', onTeam);
      window.removeEventListener('studentconnect-auth', onAuth);
    };
  }, [refresh]);

  return <TeamContext.Provider value={{ team, loading, refresh }}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  return useContext(TeamContext);
}
