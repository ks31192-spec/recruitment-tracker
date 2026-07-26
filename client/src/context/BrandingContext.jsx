import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BrandingContext = createContext({
  schoolName: 'A M World School',
  schoolTagline: 'Empowering Education Since 2010',
  schoolShort: 'AM',
  schoolLogo: null,
  refresh: () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    schoolName: 'A M World School',
    schoolTagline: 'Empowering Education Since 2010',
    schoolShort: 'AM',
    schoolLogo: null,
  });

  const load = useCallback(() => {
    fetch('/api/branding').then(r => r.json()).then(r => {
      if (r.success && r.data) {
        setBranding({
          schoolName: r.data.school_name || 'A M World School',
          schoolTagline: r.data.school_tagline || 'Empowering Education Since 2010',
          schoolShort: r.data.school_short || 'AM',
          schoolLogo: r.data.school_logo || null,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  return <BrandingContext.Provider value={{ ...branding, refresh: load }}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
