import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Bell, Phone, MessageCircle, Mail, User } from 'lucide-react';

const typeIcons = { call: Phone, whatsapp: MessageCircle, email: Mail, sms: MessageCircle, in_person: User };

export default function FollowUps() {
  const [followups, setFollowups] = useState([]);

  useEffect(() => {
    api.get('/communications/follow-ups').then(r => setFollowups(r.data.data));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>

      {followups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Bell className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No pending follow-ups</p>
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
