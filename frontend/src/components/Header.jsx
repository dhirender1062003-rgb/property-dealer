import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import Logo from './Logo';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { telLink } from '../utils/format';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Buy', to: '/properties?listing_type=buy' },
  { label: 'Rent', to: '/properties?listing_type=rent' },
  { label: 'Lease', to: '/properties?listing_type=lease' },
  { label: 'Commercial', to: '/properties?category=commercial' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

// A nav item is active when the path matches and every query param in its
// link is present in the current URL with the same value.
function isItemActive(item, location) {
  const [path, query = ''] = item.to.split('?');
  if (path === '/') return location.pathname === '/';
  if (location.pathname !== path) return false;
  const wanted = new URLSearchParams(query);
  const current = new URLSearchParams(location.search);
  if ([...wanted.keys()].length === 0) return true;
  return [...wanted.entries()].every(([k, v]) => current.get(k) === v);
}

export default function Header() {
  const settings = useSiteSettings();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu whenever the page changes.
  const [lastLocationKey, setLastLocationKey] = useState(location.key);
  if (location.key !== lastLocationKey) {
    setLastLocationKey(location.key);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  return (
    <>
      <div className="topbar">
        <div className="container topbar__inner">
          <span className="topbar__item">
            <MapPin size={14} /> Ghaziabad · Noida · Greater Noida · Noida Extension
          </span>
          <span className="topbar__links">
            {settings.phone && (
              <a href={telLink(settings.phone)} className="topbar__item">
                <Phone size={14} /> {settings.phone}
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="topbar__item">
                <Mail size={14} /> {settings.email}
              </a>
            )}
          </span>
        </div>
      </div>

      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <div className="container header__inner">
          <Logo />

          <nav className={`nav ${open ? 'nav--open' : ''}`} aria-label="Main">
            <ul className="nav__list">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={() => `nav__link ${isItemActive(item, location) ? 'nav__link--active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="nav__mobile-actions">
              {settings.phone && (
                <a href={telLink(settings.phone)} className="btn btn--gold btn--block">
                  <Phone size={18} /> Call {settings.phone}
                </a>
              )}
              <Link to="/properties" className="btn btn--outline-light btn--block">
                View All Properties
              </Link>
            </div>
          </nav>

          <div className="header__actions">
            <Link to="/properties" className="btn btn--gold header__cta">
              View Properties
            </Link>
            <button
              type="button"
              className="header__toggle"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </header>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
