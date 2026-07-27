import { ArrowLeft } from 'lucide-react';

// Shared colour palette and section shell for the long forms, so a form reads
// as distinct blocks instead of a stack of identical white cards.
// Class strings are written out in full so Tailwind doesn't purge them.
export const TONES = {
  blue: {
    bar: 'bg-gradient-to-r from-blue-500 to-indigo-500', chip: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100', card: 'bg-blue-50/40 border-blue-100',
    btn: 'text-blue-600 border-blue-200 hover:bg-blue-50',
  },
  emerald: {
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', chip: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100', card: 'bg-emerald-50/40 border-emerald-100',
    btn: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
  },
  violet: {
    bar: 'bg-gradient-to-r from-violet-500 to-purple-500', chip: 'bg-violet-50 text-violet-600',
    border: 'border-violet-100', card: 'bg-violet-50/40 border-violet-100',
    btn: 'text-violet-600 border-violet-200 hover:bg-violet-50',
  },
  amber: {
    bar: 'bg-gradient-to-r from-amber-500 to-orange-500', chip: 'bg-amber-50 text-amber-600',
    border: 'border-amber-100', card: 'bg-amber-50/40 border-amber-100',
    btn: 'text-amber-600 border-amber-200 hover:bg-amber-50',
  },
  rose: {
    bar: 'bg-gradient-to-r from-rose-500 to-pink-500', chip: 'bg-rose-50 text-rose-600',
    border: 'border-rose-100', card: 'bg-rose-50/40 border-rose-100',
    btn: 'text-rose-600 border-rose-200 hover:bg-rose-50',
  },
  cyan: {
    bar: 'bg-gradient-to-r from-cyan-500 to-sky-500', chip: 'bg-cyan-50 text-cyan-600',
    border: 'border-cyan-100', card: 'bg-cyan-50/40 border-cyan-100',
    btn: 'text-cyan-600 border-cyan-200 hover:bg-cyan-50',
  },
};

export function Section({ icon: Icon, title, tone, action, children }) {
  return (
    <div className={`bg-white rounded-xl border ${tone.border} shadow-sm overflow-hidden`}>
      <div className={`h-1 ${tone.bar}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
            <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${tone.chip}`}>
              <Icon size={18} />
            </span>
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

// Gradient page banner with a back button, matching the list pages' headers.
export function FormBanner({ gradient, title, subtitle, onBack }) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-5 text-white flex items-center gap-3`}>
      {onBack && (
        <button onClick={onBack} type="button" className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors">
          <ArrowLeft size={20} />
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
