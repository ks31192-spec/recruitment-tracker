import { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext({
  schoolName: 'A M World School',
  schoolTagline: 'Empowering Education Since 2010',
  schoolShort: 'AM',
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    schoolName: 'A M World School',
    schoolTagline: 'Empowering Education Since 2010',
    schoolShort: 'AM',
  });

  useEffect(() => {
    fetch('/api/branding').then(r => r.json()).then(r => {
      if (r.success && r.data) {
        setBranding({
          schoolName: r.data.school_name || 'A M World School',
          schoolTagline: r.data.school_tagline || 'Empowering Education Since 2010',
          schoolShort: r.data.school_short || 'AM',
        });
      }
    }).catch(() => {});
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
