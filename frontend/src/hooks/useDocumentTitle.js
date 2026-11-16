import { useEffect } from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';

export function useDocumentTitle(title) {
  const { business_name: businessName } = useSiteSettings();
  useEffect(() => {
    document.title = title ? `${title} | ${businessName}` : businessName;
  }, [title, businessName]);
}
