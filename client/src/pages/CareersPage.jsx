import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, MapPin, Clock, GraduationCap, IndianRupee, ChevronRight, Users, Search, Building2 } from 'lucide-react';

export default function CareersPage() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  useEffect(() => {
    axios.get('/api/public/careers').then(r => setVacancies(r.data.data)).finally(() => setLoading(false));
  }, []);

  const departments = [...new Set(vacancies.map(v => v.department_name).filter(Boolean))];

  const filtered = vacancies.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.title.toLowerCase().includes(q) || (v.subject || '').toLowerCase().includes(q) || (v.department_name || '').toLowerCase().includes(q);
    const matchDept = deptFilter === 'all' || v.department_name === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">A M World School</h1>
              <p className="text-xs text-gray-500">Empowering Education Since 2010</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/portal" className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Check Application Status
            </Link>
            <Link to="/login" className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors font-medium">
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-blue-200 text-sm font-medium tracking-widest uppercase mb-4">We Are Hiring</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
              Shape the Future of Education
            </h2>
            <p className="text-blue-100 text-lg sm:text-xl leading-relaxed mb-10">
              Join a team of passionate educators dedicated to nurturing young minds. We're looking for talented individuals who share our vision of excellence in education.
            </p>
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold">{vacancies.length}</p>
                  <p className="text-blue-200 text-xs">Open Positions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold">{departments.length}</p>
                  <p className="text-blue-200 text-xs">Departments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {!loading && vacancies.length > 0 && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search positions by title, subject, or department..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            {departments.length > 1 && (
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : vacancies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="text-gray-400" size={28} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">No Openings Right Now</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">We don't have any open positions at the moment. Please check back later for new opportunities.</p>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No positions match your search. Try a different keyword.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map(v => (
                  <Link key={v.id} to={`/careers/${v.id}`}
                    className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {v.title}
                            </h2>
                            <span className="hidden sm:inline-flex shrink-0 px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                              {v.positions_count - (v.positions_filled || 0)} opening{v.positions_count - (v.positions_filled || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
                            {v.department_name && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-gray-400" />{v.department_name}
                              </span>
                            )}
                            {v.designation_title && (
                              <span className="flex items-center gap-1.5">
                                <Briefcase size={14} className="text-gray-400" />{v.designation_title}
                              </span>
                            )}
                            {v.subject && (
                              <span className="flex items-center gap-1.5">
                                <GraduationCap size={14} className="text-gray-400" />{v.subject}
                              </span>
                            )}
                            {(v.experience_min > 0 || v.experience_max) && (
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} className="text-gray-400" />
                                {v.experience_min || 0}{v.experience_max ? `-${v.experience_max}` : '+'} years exp.
                              </span>
                            )}
                            {(v.salary_range_min || v.salary_range_max) && (
                              <span className="flex items-center gap-1.5">
                                <IndianRupee size={14} className="text-gray-400" />
                                {v.salary_range_min ? `${(v.salary_range_min / 1000).toFixed(0)}k` : ''}
                                {v.salary_range_min && v.salary_range_max ? ' - ' : ''}
                                {v.salary_range_max ? `${(v.salary_range_max / 1000).toFixed(0)}k` : ''}/month
                              </span>
                            )}
                          </div>

                          {v.qualification_required && (
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium text-gray-600">Qualification:</span> {v.qualification_required}
                            </p>
                          )}
                          {v.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{v.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <ChevronRight size={18} className="text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        <span>Posted {new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {v.academic_year && <span>Academic Year: {v.academic_year}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">A M World School</p>
                <p className="text-xs text-gray-500">Excellence in Education</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link to="/portal" className="hover:text-blue-600 transition-colors">Application Status</Link>
              <span className="text-gray-300">|</span>
              <Link to="/login" className="hover:text-blue-600 transition-colors">Staff Login</Link>
            </div>
            <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} A M World School. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
