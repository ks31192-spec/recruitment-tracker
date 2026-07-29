import { Loader2 } from 'lucide-react';

// Shared placeholders. Without these a page renders as an empty white area while
// its request is in flight, which reads as "nothing here" rather than "loading".

/** Grey bars roughly the shape of the table that is about to appear. */
export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="flex gap-3 pb-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-3.5 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`h-3.5 rounded flex-1 ${c === 0 ? 'bg-gray-200' : 'bg-gray-100'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for pages laid out as cards rather than rows. */
export function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-gray-400" role="status">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/**
 * Shown when a request succeeded but returned nothing. `icon` keeps it visually
 * anchored to the page it sits on, and `action` gives the user a way forward.
 */
export function EmptyState({ icon: Icon, title, hint, action, tone = 'blue' }) {
  const chips = {
    blue: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-500',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
    rose: 'bg-gradient-to-br from-rose-500 to-pink-500',
    cyan: 'bg-gradient-to-br from-cyan-500 to-sky-500',
    slate: 'bg-gradient-to-br from-slate-500 to-gray-500',
  };
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <span className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white shadow-sm mb-3 ${chips[tone] || chips.blue}`}>
          <Icon className="w-7 h-7" />
        </span>
      )}
      <p className="text-gray-700 font-medium">{title}</p>
      {hint && <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shown when the request itself failed, with a way to try again. */
export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-gray-700 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Try again
        </button>
      )}
    </div>
  );
}
