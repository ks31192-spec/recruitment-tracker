import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const toast = useCallback({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
  }, [addToast]);

  // make toast callable as toast.success / toast.error
  const toastFn = Object.assign((msg) => addToast(msg, 'success'), {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
  });

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.2s_ease-out] ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
            {t.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} className="p-0.5 hover:opacity-70"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
