import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  no_show: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const statusDot = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-gray-400',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function buildCalendarGrid(year, month, interviews) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const interviewsByDate = {};
  for (const iv of interviews) {
    if (!interviewsByDate[iv.scheduled_date]) interviewsByDate[iv.scheduled_date] = [];
    interviewsByDate[iv.scheduled_date].push(iv);
  }

  const cells = [];

  // Previous month padding
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d, isCurrentMonth: false, interviews: interviewsByDate[dateStr] || [] });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, interviews: interviewsByDate[dateStr] || [] });
  }

  // Next month padding
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: d, isCurrentMonth: false, interviews: interviewsByDate[dateStr] || [] });
    }
  }

  return cells;
}

export default function InterviewCalendar() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    api.get(`/interviews/schedule/calendar?month=${monthParam}`)
      .then(r => setInterviews(r.data.data))
      .catch(() => setInterviews([]))
      .finally(() => setLoading(false));
  }, [monthParam]);

  const grid = useMemo(() => buildCalendarGrid(year, month, interviews), [year, month, interviews]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const interviewCount = interviews.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Interview Calendar</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} />
          <span>{interviewCount} interview{interviewCount !== 1 ? 's' : ''} this month</span>
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Today
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="py-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7 border-t border-l border-gray-200">
            {grid.map((cell, idx) => {
              const isToday = cell.date === todayStr;
              return (
                <div
                  key={idx}
                  className={`min-h-[70px] border-r border-b border-gray-200 p-1 transition-colors ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday
                      ? 'text-white bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center'
                      : cell.isCurrentMonth
                        ? 'text-gray-900 pl-1'
                        : 'text-gray-400 pl-1'
                  }`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5 overflow-y-auto max-h-[44px]">
                    {cell.interviews.map(iv => (
                      <button
                        key={iv.id}
                        onClick={() => navigate(`/candidates/${iv.candidate_id}`)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight border truncate cursor-pointer hover:opacity-80 transition-opacity ${statusColors[iv.status] || statusColors.scheduled}`}
                        title={`${iv.full_name} - ${iv.vacancy_title} (${iv.interview_type})`}
                      >
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[iv.status] || statusDot.scheduled}`} />
                          <span className="truncate">
                            {iv.scheduled_time ? iv.scheduled_time.slice(0, 5) + ' ' : ''}{iv.full_name}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">Status:</span>
          {Object.entries({ scheduled: 'Scheduled', completed: 'Completed', no_show: 'No Show', cancelled: 'Cancelled' }).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2 h-2 rounded-full ${statusDot[key]}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
