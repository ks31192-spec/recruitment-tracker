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

  // Keep the tab title and the iOS home-screen name in step with the branding
  // — both are otherwise stuck at whatever the app was built with.
  useEffect(() => {
    const name = branding.schoolName;
    // Names like "Sarvagya Solutions - Recruitment" already say it; don't
    // append and end up with "... Recruitment - Recruitment Tracker".
    document.title = /recruit/i.test(name) ? name : `${name} - Recruitment Tracker`;

    // iOS reads this at install time for the home-screen label. Take it from
    // the manifest so it matches the short_name Android uses.
    fetch('/api/manifest.webmanifest')
      .then(r => r.json())
      .then(m => {
        const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (meta && m.short_name) meta.setAttribute('content', m.short_name);
      })
      .catch(() => {});
  }, [branding.schoolName]);

  return <BrandingContext.Provider value={{ ...branding, refresh: load }}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
