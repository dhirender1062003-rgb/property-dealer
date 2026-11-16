import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';
import adminApi, { tokens } from './adminApi';
import { Loader } from '../components/StatusMessage';
import { NotStaffError, can } from './permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(tokens.access ? 'loading' : 'anonymous');

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    if (!tokens.access) return;
    adminApi
      .get('/auth/me/')
      .then(({ data }) => {
        if (data.is_management) {
          setUser(data);
          setStatus('authenticated');
        } else {
          logout();
        }
      })
      .catch(logout);
  }, [logout]);

  useEffect(() => {
    window.addEventListener('dashboard:logout', logout);
    return () => window.removeEventListener('dashboard:logout', logout);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const { data } = await axios.post(`${import.meta.env.VITE_DJANGO_API_URL}/auth/login/`, { username, password });
    if (!data.user?.is_management) {
      throw new NotStaffError('This account does not have dashboard access.');
    }
    tokens.save(data);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

/** Shows children only to signed-in staff (optionally with a permission). */
export function ProtectedRoute({ permission, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loader label="Checking your session…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/dashboard/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (permission && !can(user, permission)) {
    return (
      <div className="dash-denied">
        <ShieldAlert size={40} />
        <h2>Access restricted</h2>
        <p>Your role ({user.role}) cannot open this page. Ask an admin if you need access.</p>
      </div>
    );
  }
  return children;
}
