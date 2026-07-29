import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    // Only a straight rejection of the token means the session is really over.
    // A network blip or a cold-start timeout used to discard it too, which
    // logged people out at random.
    let cancelled = false;
    const attempt = (triesLeft, delay) => {
      api.get('/auth/me')
        .then(r => { if (!cancelled) { setUser(r.data.data); setLoading(false); } })
        .catch(err => {
          if (cancelled) return;
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            setLoading(false);
            return;
          }
          if (triesLeft > 0) {
            setTimeout(() => attempt(triesLeft - 1, delay * 2), delay);
            return;
          }
          // Server unreachable — keep the token so the session survives.
          setLoading(false);
        });
    };
    attempt(2, 1000);
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.data.token);
    setUser(r.data.data.user);
    return r.data.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
