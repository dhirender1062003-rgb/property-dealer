import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

// Defaults from frontend/.env. Once the Django admin site settings exist
// (GET /api/site-settings/), values saved there replace these automatically.
const DEFAULT_SETTINGS = {
  business_name: import.meta.env.VITE_BUSINESS_NAME || 'Property Dealer',
  phone: import.meta.env.VITE_CONTACT_PHONE || '',
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '',
  email: import.meta.env.VITE_CONTACT_EMAIL || '',
  address: import.meta.env.VITE_OFFICE_ADDRESS || '',
  business_hours: import.meta.env.VITE_BUSINESS_HOURS || '',
};

const SiteSettingsContext = createContext(DEFAULT_SETTINGS);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    api
      .get('/site-settings/')
      .then(({ data }) => {
        if (!active || !data || typeof data !== 'object') return;
        const fromApi = {
          business_name: data.business_name,
          tagline: data.tagline,
          phone: data.phone,
          whatsapp: data.whatsapp_number,
          email: data.email,
          address: data.address,
          business_hours: data.office_hours,
          logo: data.logo,
          social_links: data.social_links,
        };
        // Ignore empty values so a blank admin field does not erase a default.
        const saved = Object.fromEntries(
          Object.entries(fromApi).filter(([, v]) => v && !(typeof v === 'object' && !Object.keys(v).length)),
        );
        setSettings((current) => ({ ...current, ...saved }));
      })
      .catch(() => {
        // Endpoint not available yet: keep the .env defaults.
      });
    return () => {
      active = false;
    };
  }, []);

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteSettings = () => useContext(SiteSettingsContext);
