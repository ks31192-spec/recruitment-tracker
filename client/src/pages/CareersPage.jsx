import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, MapPin, Clock, GraduationCap, IndianRupee, ChevronRight } from 'lucide-react';

export default function CareersPage() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/public/careers').then(r => setVacancies(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">A M World School</h1>
            <p className="text-sm text-gray-500">Join Our Team — Current Openings</p>
          </div>
          <Link to="/login" className="text-sm text-blue-600 hover:underline">Staff Login</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {vacancies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <Briefcase className="mx-auto text-gray-300 mb-4" size={56} />
            <h2 className="text-xl font-semibold text-gray-700">No Openings Right Now</h2>
            <p className="text-gray-500 mt-2">Please check back later for new opportunities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{vacancies.length} open position{vacancies.length !== 1 ? 's' : ''}</p>
            {vacancies.map(v => (
              <Link key={v.id} to={`/careers/${v.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{v.title}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      {v.department_name && <span className="flex items-center gap-1"><MapPin size={14} />{v.department_name}</span>}
                      {v.designation_title && <span className="flex items-center gap-1"><Briefcase size={14} />{v.designation_title}</span>}
                      {v.subject && <span className="flex items-center gap-1"><GraduationCap size={14} />{v.subject}</span>}
                      {(v.experience_min > 0 || v.experience_max) && (
                        <span className="flex items-center gap-1"><Clock size={14} />{v.experience_min || 0}{v.experience_max ? `-${v.experience_max}` : '+'} years</span>
                      )}
                      {(v.salary_range_min || v.salary_range_max) && (
                        <span className="flex items-center gap-1"><IndianRupee size={14} />
                          {v.salary_range_min ? `₹${(v.salary_range_min / 1000).toFixed(0)}k` : ''}{v.salary_range_min && v.salary_range_max ? ' - ' : ''}
                          {v.salary_range_max ? `₹${(v.salary_range_max / 1000).toFixed(0)}k` : ''}
                        </span>
                      )}
                    </div>
                    {v.qualification_required && <p className="text-sm text-gray-500 mt-2">Required: {v.qualification_required}</p>}
                    {v.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{v.description}</p>}
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors mt-2 shrink-0" size={20} />
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  <span>{v.positions_count - (v.positions_filled || 0)} position{v.positions_count - (v.positions_filled || 0) !== 1 ? 's' : ''} available</span>
                  <span>Posted {new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} A M World School. All rights reserved.
      </footer>
    </div>
  );
}
