import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { CalendarCheck, Clock, MapPin, Users, Video, Building } from 'lucide-react';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-700', rescheduled: 'bg-amber-100 text-amber-700',
};

export default function Interviews() {
  const [tab, setTab] = useState('today');
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    const endpoint = tab === 'today' ? '/interviews/schedule/today' : '/interviews/schedule/upcoming';
    api.get(endpoint).then(r => setInterviews(r.data.data));
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-white/70 text-sm mt-1">Schedule, track and manage candidate interviews</p>
        </div>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('today')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Today</button>
        <button onClick={() => setTab('upcoming')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Upcoming</button>
      </div>

      {interviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CalendarCheck className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No {tab === 'today' ? "interviews today" : "upcoming interviews"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-gray-400">{i.interview_type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[i.status] || 'bg-gray-100'}`}>{i.status}</span>
                  </div>
                  <Link to={`/candidates/${i.candidate_id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">{i.full_name}</Link>
                  <p className="text-sm text-gray-500">{i.vacancy_title}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-900">{i.scheduled_date}</p>
                  {i.scheduled_time && <p className="text-gray-500">{i.scheduled_time}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                {i.mode && <span className="flex items-center gap-1">{i.mode === 'online' ? <Video size={14} /> : <Building size={14} />}{i.mode === 'online' ? 'Online' : 'In-person'}</span>}
                {i.location_or_link && <span className="flex items-center gap-1"><MapPin size={14} />{i.location_or_link}</span>}
                {i.panel_names && <span className="flex items-center gap-1"><Users size={14} />{i.panel_names}</span>}
                {i.demo_topic && <span>Topic: {i.demo_topic}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
