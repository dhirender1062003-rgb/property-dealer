import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, TriangleAlert } from 'lucide-react';
import { useAuth } from '../auth';
import { NotStaffError } from '../permissions';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function LoginPage() {
  useDocumentTitle('Dashboard Login');
  const { status, login } = useAuth();
  const { business_name: businessName } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const checkCapsLock = (e) => setCapsLock(Boolean(e.getModifierState?.('CapsLock')));
  const target = location.state?.from || '/dashboard';

  if (status === 'authenticated') return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username (or email) and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof NotStaffError) setError(err.message);
      else if (err.response?.status === 401) setError('Incorrect username or password.');
      else if (err.response?.status === 429) setError('Too many attempts. Please wait a minute and try again.');
      else if (!err.response) setError('Cannot reach the server. Please try again.');
      else setError('Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-login">
      <form className="dash-login__card" onSubmit={submit} noValidate>
        <span className="dash-login__icon"><LockKeyhole size={26} /></span>
        <h1>{businessName}</h1>
        <p>Sign in to the CRM dashboard</p>

        {error && (
          <div className="form-result form-result--warning" role="alert">
            <TriangleAlert size={20} /> <span>{error}</span>
          </div>
        )}

        <label className="field">
          <span className="field__label">Username or email</span>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <span className="dash-password">
            <input type={showPassword ? 'text' : 'password'} value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   onKeyUp={checkCapsLock} onKeyDown={checkCapsLock}
                   autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          {capsLock && <span className="field__hint dash-capslock">Caps Lock is on</span>}
        </label>
        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="dash-login__back">← Back to website</Link>
      </form>
    </div>
  );
}
