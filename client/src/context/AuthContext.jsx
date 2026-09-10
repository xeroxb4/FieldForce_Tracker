import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
      api
        .get('/auth/me')
        .then((res) => {
          const prev = (() => {
            try {
              return JSON.parse(localStorage.getItem('user') || '{}');
            } catch {
              return {};
            }
          })();
          const next = { ...prev, ...res.data, token };
          localStorage.setItem('user', JSON.stringify(next));
          setUser(next);
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const setUserFromProfile = (data) => {
    const next = { ...user, ...data, token: user?.token || localStorage.getItem('token') };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  };

  const updateProfilePicture = async (profilePicture) => {
    const { data } = await api.put('/auth/profile-picture', { profilePicture });
    const next = { ...user, ...data };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
    return next;
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, updateProfilePicture, setUserFromProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
