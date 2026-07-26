import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { FileText, TrendingUp, DollarSign, AlertTriangle, Download, Search, Calendar, Filter, Users, Briefcase, BarChart3 } from 'lucide-react';

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'naukri', label: 'Naukri' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'direct_call', label: 'Direct Call' },
  { value: 'other', label: 'Other' },
];

const GROUP_OPTIONS = [
  { key: 'department', label: 'Department' },
  { key: 'source', label: 'Source' },
  { key: 'month', label: 'Month' },
  { key: 'stage', label: 'Stage' },
];

const STAGE_LABELS = {
  applied: 'Applied', shortlisted: 'Shortlisted', interview_scheduled: 'Interview',
  interview_done: 'Interviewed', demo_scheduled: 'Demo', demo_done: 'Demo Done',
  selected: 'Selected', offer_made: 'Offered', joined: 'Joined',
  rejected: 'Rejected', waitlisted: 'Waitlisted', declined: 'Declined', no_response: 'No Response',
};

const SOURCE_LABELS = {
  walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp',
  referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other',
};

function SummaryCard({ icon: Icon, label, value, color = 'text-blue-600', bgColor = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function downloadCSV(data, headers, filename) {
  if (!data.length) return;
  const csvRows = [headers.map(h => h.label).join(',')];
  for (const row of data) {
    csvRows.push(headers.map(h => {
      let val = row[h.key] ?? '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Custom Report Tab ----
function CustomReportTab() {
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [source, setSource] = useState('');
  const [groupBy, setGroupBy] = useState(['department']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/settings/departments').then(r => setDepartments(r.data.data)).catch(() => {});
  }, []);

  const toggleGroup = (key) => {
    setGroupBy(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const generateReport = async () => {
    if (!groupBy.length) {
      toast.error('Select at least one grouping');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('group_by', groupBy.join(','));
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (department) params.set('department_id', department);
      if (source) params.set('source', source);
      const r = await api.get(`/analytics/custom-report?${params}`);
      setResults(r.data.data);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const totalApps = results.reduce((s, r) => s + (r.total_applications || 0), 0);
  const totalCandidates = results.reduce((s, r) => s + (r.unique_candidates || 0), 0);
  const totalHired = results.reduce((s, r) => s + (r.hired || 0), 0);
  const conversionRate = totalApps > 0 ? ((totalHired / totalApps) * 100).toFixed(1) : '0';

  const tableHeaders = [];
  if (groupBy.includes('department')) tableHeaders.push({ key: 'department', label: 'Department' });
  if (groupBy.includes('source')) tableHeaders.push({ key: 'source', label: 'Source' });
  if (groupBy.includes('month')) tableHeaders.push({ key: 'month', label: 'Month' });
  if (groupBy.includes('stage')) tableHeaders.push({ key: 'stage', label: 'Stage' });
  tableHeaders.push(
    { key: 'total_applications', label: 'Applications' },
    { key: 'unique_candidates', label: 'Candidates' },
    { key: 'hired', label: 'Hired' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'in_pipeline', label: 'In Pipeline' },
  );

  const displayRows = results.map(r => ({
    ...r,
    source: SOURCE_LABELS[r.source] || r.source || '-',
    stage: STAGE_LABELS[r.stage] || r.stage || '-',
    department: r.department || '-',
  }));

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Group By</label>
          <div className="flex flex-wrap gap-2">
            {GROUP_OPTIONS.map(o => (
              <button key={o.key} onClick={() => toggleGroup(o.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                  groupBy.includes(o.key)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generateReport} disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          <Search size={14} />
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={Users} label="Total Candidates" value={totalCandidates} />
            <SummaryCard icon={Briefcase} label="Total Applications" value={totalApps} color="text-indigo-600" bgColor="bg-indigo-50" />
            <SummaryCard icon={Users} label="Hired" value={totalHired} color="text-green-600" bgColor="bg-green-50" />
            <SummaryCard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} color="text-amber-600" bgColor="bg-amber-50" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Results ({results.length} rows)</span>
              <button onClick={() => downloadCSV(displayRows, tableHeaders, 'recruitment-report.csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {tableHeaders.map(h => (
                      <th key={h.key} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {tableHeaders.map(h => (
                        <td key={h.key} className="px-4 py-3 text-gray-800 whitespace-nowrap">{row[h.key] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Hiring Forecast Tab ----
function HiringForecastTab() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/hiring-forecast')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load forecast'))
      .finally(() => setLoading(false));
  }, []);

  const confBadge = (c) => {
    const colors = { high: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-red-100 text-red-700' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[c] || colors.low}`}>{c}</span>;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Hiring Forecast for Open Vacancies</h3>
        <p className="text-xs text-gray-500 mt-0.5">Predicted time-to-fill based on historical data</p>
      </div>
      {data.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No open vacancies to forecast.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Vacancy</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Predicted Days</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Confidence</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Historical Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(row => (
                <tr key={row.vacancy_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{row.title}</td>
                  <td className="px-4 py-3 text-gray-600">{row.department || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">{row.predicted_days} days</td>
                  <td className="px-4 py-3 text-center">{confBadge(row.confidence)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.historical_avg ? `${row.historical_avg} days` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Cost Analysis Tab ----
function CostAnalysisTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/cost-per-hire')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load cost data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!data) return null;

  const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">{fmt(data.overall.total_cost)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Hires</p>
            <p className="text-xl font-bold text-gray-900">{data.overall.total_hires}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Avg Cost per Hire</p>
            <p className="text-xl font-bold text-green-700">{fmt(data.overall.cost_per_hire)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Cost per Vacancy</h3>
        </div>
        {data.per_vacancy.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No cost data recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Vacancy</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Cost</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Positions Filled</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost per Hire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.per_vacancy.map(row => (
                  <tr key={row.vacancy_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{row.title}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmt(row.total_cost)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.positions_filled || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.cost_per_hire)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- SLA Breaches Tab ----
function SLABreachesTab() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/sla-breaches')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load SLA data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">SLA Breaches</h3>
          <p className="text-xs text-gray-500 mt-0.5">Candidates exceeding stage time limits</p>
        </div>
        {data.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-full">{data.length} breach{data.length !== 1 ? 'es' : ''}</span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No SLA breaches found. All candidates are within limits.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Candidate</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Vacancy</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Days in Stage</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">SLA Limit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Breach Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(row => {
                const severe = row.breach_days > row.sla_limit; // >2x SLA means breach_days > sla_limit
                return (
                  <tr key={row.application_id} className={severe ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${severe ? 'text-red-900' : 'text-gray-900'}`}>{row.candidate_name}</span>
                      {row.phone && <p className="text-xs text-gray-500">{row.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.vacancy_title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {STAGE_LABELS[row.current_stage] || row.current_stage}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${severe ? 'text-red-700' : 'text-gray-900'}`}>{row.days_in_stage}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.sla_limit} days</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${severe ? 'text-red-700' : 'text-amber-600'}`}>+{row.breach_days}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Main Reports Page ----
const TABS = [
  { key: 'custom', label: 'Custom Report', icon: FileText },
  { key: 'forecast', label: 'Hiring Forecast', icon: TrendingUp },
  { key: 'cost', label: 'Cost Analysis', icon: DollarSign },
  { key: 'sla', label: 'SLA Breaches', icon: AlertTriangle },
];

export default function Reports() {
  const [tab, setTab] = useState('custom');

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-6 mb-1 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Custom Reports</h1>
            <p className="text-white/70 text-sm mt-1">Generate and export recruitment reports</p>
          </div>
          <FileText size={32} className="text-white/30" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'custom' && <CustomReportTab />}
      {tab === 'forecast' && <HiringForecastTab />}
      {tab === 'cost' && <CostAnalysisTab />}
      {tab === 'sla' && <SLABreachesTab />}
    </div>
  );
}
