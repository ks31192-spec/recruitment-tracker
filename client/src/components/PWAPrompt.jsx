import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Smartphone } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  // If the prompt reappears right after we applied an update, the new service
  // worker never took control. Unregister it and hard reload so the user isn't
  // stuck seeing "Update available" over and over.
  useEffect(() => {
    if (!needRefresh) return;
    const startedAt = Number(sessionStorage.getItem('pwa-update-started') || 0);
    if (!startedAt || Date.now() - startedAt > 30000) return;
    sessionStorage.removeItem('pwa-update-started');
    setNeedRefresh(false);
    navigator.serviceWorker?.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {})
      .then(() => window.location.reload());
  }, [needRefresh]);

  const applyUpdate = () => {
    sessionStorage.setItem('pwa-update-started', String(Date.now()));
    setNeedRefresh(false);
    // updateServiceWorker(true) reloads the page itself once the new worker
    // takes control — reloading here too races it, so the page comes back
    // under the old worker and the prompt fires again.
    updateServiceWorker(true);
  };

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isStandalone) return;

    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    if (ios) {
      const timer = setTimeout(() => setShowInstallBanner(true), 5000);
      return () => clearTimeout(timer);
    }

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setTimeout(() => setShowInstallBanner(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  return (
    <>
      {needRefresh && (
        <div className="fixed bottom-20 lg:bottom-3 right-3 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-72 animate-slide-up">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-600 shrink-0" />
            <p className="text-sm font-medium text-gray-900 flex-1">Update available</p>
            <button onClick={() => setNeedRefresh(false)} className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={applyUpdate}
              className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Reload
            </button>
            <button onClick={() => setNeedRefresh(false)}
              className="px-2 py-1.5 text-gray-500 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Later
            </button>
          </div>
        </div>
      )}

      {showInstallBanner && !needRefresh && (
        <div className="fixed bottom-24 lg:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl shadow-2xl p-4 text-white animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Install AM Recruit</p>
              <p className="text-xs text-white/70 mt-0.5">Add to your home screen for quick access, offline support, and a native app experience.</p>
            </div>
            <button onClick={dismissInstall} className="p-1 text-white/60 hover:text-white shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors">
              <Download size={16} /> Install App
            </button>
            <button onClick={dismissInstall}
              className="px-3 py-2 text-white/80 text-sm font-medium rounded-lg border border-white/20 hover:bg-white/10 transition-colors">
              Not Now
            </button>
          </div>
        </div>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4 pb-24 lg:pb-4" onClick={() => setShowIOSGuide(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-white">AM</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Install AM Recruit</h3>
              <p className="text-sm text-gray-500 mt-1">Add this app to your home screen</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">1</span>
                <p className="text-gray-700">Tap the <strong>Share</strong> button <span className="inline-block w-5 h-5 align-middle text-center">⬆</span> in Safari</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">2</span>
                <p className="text-gray-700">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">3</span>
                <p className="text-gray-700">Tap <strong>"Add"</strong> to install</p>
              </div>
            </div>
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
