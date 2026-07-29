import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Bell, Phone, MessageCircle, Mail, User } from 'lucide-react';
import { CardSkeleton, EmptyState, ErrorState } from '../components/States.jsx';

const typeIcons = { call: Phone, whatsapp: MessageCircle, email: Mail, sms: MessageCircle, in_person: User };

export default function FollowUps() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api.get('/communications/follow-ups')
      .then(r => setFollowups(r.data.data || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-white/70 text-sm mt-1">Stay on top of pending communications</p>
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : failed ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <ErrorState message="Could not load follow-ups." onRetry={load} />
        </div>
      ) : followups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState
            icon={Bell}
            tone="amber"
            title="Nothing to follow up"
            hint="Log a call or message against a candidate with a follow-up date and it will appear here."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {followups.map(f => {
            const overdue = f.follow_up_date < today;
            const Icon = typeIcons[f.comm_type] || Phone;
            return (
              <div key={f.id} className={`bg-white rounded-xl border p-4 ${overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${overdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <Link to={`/candidates/${f.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600">{f.full_name}</Link>
                      <p className="text-sm text-gray-600 mt-0.5">{f.summary}</p>
                      {f.outcome && <p className="text-xs text-gray-500 mt-0.5">Outcome: {f.outcome}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {overdue ? 'Overdue' : 'Due'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{f.follow_up_date}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
