import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2, CalendarClock, ExternalLink, LayoutDashboard, LayoutGrid, LogOut, MapPin, Menu, Settings,
  UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from './auth';
import { can } from './permissions';
import { useSiteSettings } from '../context/SiteSettingsContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { to: '/dashboard/categories', label: 'Categories', icon: LayoutGrid },
  { to: '/dashboard/leads', label: 'Leads', icon: Users },
  { to: '/dashboard/customers', label: 'Customers', icon: UserRound },
  { to: '/dashboard/site-visits', label: 'Site Visits', icon: CalendarClock },
  { to: '/dashboard/locations', label: 'Locations', icon: MapPin },
  { to: '/dashboard/settings', label: 'Website Settings', icon: Settings, permission: 'settings.manage' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { business_name: businessName } = useSiteSettings();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile sidebar after navigating.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  return (
    <div className="dash">
      <aside className={`dash-sidebar ${open ? 'is-open' : ''}`} aria-label="Dashboard navigation">
        <div className="dash-sidebar__brand">
          <svg viewBox="0 0 64 64" aria-hidden="true" width="38" height="38">
            <rect width="64" height="64" rx="14" fill="#C9A24B" />
            <path d="M32 13 12 29v4h5v18h11V40h8v11h11V33h5v-4L32 13Z" fill="#0A1A33" />
          </svg>
          <span>
            <strong>{businessName}</strong>
            <small>CRM Dashboard</small>
          </span>
          <button type="button" className="dash-sidebar__close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>
        <nav className="dash-nav">
          {NAV.filter((item) => !item.permission || can(user, item.permission)).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `dash-nav__link ${isActive ? 'is-active' : ''}`}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="dash-sidebar__foot">
          <Link to="/" className="dash-nav__link" target="_blank" rel="noreferrer">
            <ExternalLink size={19} /> View Website
          </Link>
          <button type="button" className="dash-nav__link" onClick={logout}>
            <LogOut size={19} /> Log out
          </button>
        </div>
      </aside>
      {open && <div className="dash-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="dash-main">
        <header className="dash-topbar">
          <button type="button" className="dash-topbar__menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div className="dash-topbar__user">
            <span className="dash-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small className="dash-role">{user.role}</small>
            </span>
          </div>
        </header>
        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
