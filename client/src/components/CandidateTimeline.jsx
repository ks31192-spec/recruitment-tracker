import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  StickyNote,
  FileText,
  ShieldBan,
  Tag,
  Loader2,
} from 'lucide-react';
import api from '../lib/api.js';

const EVENT_CONFIG = {
  stage_change: {
    color: 'bg-blue-500',
    ring: 'ring-blue-100',
    Icon: ArrowRight,
    label: 'Stage Change',
  },
  interview: {
    color: 'bg-purple-500',
    ring: 'ring-purple-100',
    Icon: CalendarCheck,
    label: 'Interview',
  },
  communication: {
    color: 'bg-green-500',
    ring: 'ring-green-100',
    Icon: MessageCircle,
    label: 'Communication',
  },
  note: {
    color: 'bg-yellow-400',
    ring: 'ring-yellow-100',
    Icon: StickyNote,
    label: 'Note',
  },
  document: {
    color: 'bg-gray-400',
    ring: 'ring-gray-100',
    Icon: FileText,
    label: 'Document',
  },
  blacklist: {
    color: 'bg-red-500',
    ring: 'ring-red-100',
    Icon: ShieldBan,
    label: 'Blacklisted',
  },
  tag: {
    color: 'bg-indigo-400',
    ring: 'ring-indigo-100',
    Icon: Tag,
    label: 'Tag',
  },
};

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stageLabel(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function EventCard({ event }) {
  const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.note;
  const { Icon } = cfg;

  const renderDetails = () => {
    switch (event.type) {
      case 'stage_change':
        return (
          <>
            <p className="font-medium text-gray-900">
              Stage: {stageLabel(event.from_stage) || 'New'} <ArrowRight className="inline w-3.5 h-3.5 mx-1" /> {stageLabel(event.to_stage)}
            </p>
            {event.vacancy_title && (
              <p className="text-sm text-gray-500">Vacancy: {event.vacancy_title}</p>
            )}
            {event.changed_by_name && (
              <p className="text-xs text-gray-400">by {event.changed_by_name}</p>
            )}
          </>
        );
      case 'interview':
        return (
          <>
            <p className="font-medium text-gray-900">
              Interview {event.status === 'completed' ? 'completed' : 'scheduled'}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(event.scheduled_date)}{event.scheduled_time ? ` at ${event.scheduled_time}` : ''}
            </p>
            {event.interview_type && (
              <p className="text-sm text-gray-500">Type: {stageLabel(event.interview_type)}</p>
            )}
            {event.vacancy_title && (
              <p className="text-xs text-gray-400">For: {event.vacancy_title}</p>
            )}
          </>
        );
      case 'communication':
        return (
          <>
            <p className="font-medium text-gray-900">
              {stageLabel(event.comm_type || 'call')} ({event.direction || 'outgoing'})
            </p>
            {event.summary && <p className="text-sm text-gray-600">{event.summary}</p>}
            {event.outcome && (
              <p className="text-sm text-gray-500">Outcome: {event.outcome}</p>
            )}
            {event.logged_by_name && (
              <p className="text-xs text-gray-400">by {event.logged_by_name}</p>
            )}
          </>
        );
      case 'note':
        return (
          <>
            <p className="text-gray-800">{event.note}</p>
            {event.user_name && (
              <p className="text-xs text-gray-400">by {event.user_name}</p>
            )}
          </>
        );
      case 'document':
        return (
          <p className="font-medium text-gray-900">
            Document uploaded: <span className="text-blue-600">{event.file_name}</span>
          </p>
        );
      case 'blacklist':
        return (
          <>
            <p className="font-medium text-red-700">Blacklisted</p>
            {event.reason && <p className="text-sm text-gray-600">Reason: {event.reason}</p>}
          </>
        );
      case 'tag':
        return (
          <p className="font-medium text-gray-900 flex items-center gap-2">
            Tag added:
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: event.color || '#3b82f6' }}
            >
              {event.name}
            </span>
          </p>
        );
      default:
        return <p className="text-gray-700">{event.note || event.summary || 'Event'}</p>;
    }
  };

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className={`w-3.5 h-3.5 rounded-full ${cfg.color} ring-4 ${cfg.ring} shrink-0 z-10`} />
        <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
      </div>

      {/* Event card */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 flex-1 -mt-1 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Icon className="w-3.5 h-3.5" />
            <span>{cfg.label}</span>
          </div>
          <span className="text-xs text-gray-400" title={formatDate(event.date)}>
            {relativeTime(event.date)}
          </span>
        </div>
        {renderDetails()}
      </div>
    </div>
  );
}

export default function CandidateTimeline({ candidateId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const [timelineRes, notesRes, tagsRes, blacklistRes] = await Promise.all([
          api.get(`/candidates/${candidateId}/timeline`),
          api.get(`/candidates/${candidateId}/notes`),
          api.get(`/candidates/${candidateId}/tags`),
          api.get(`/candidates/${candidateId}/blacklist`),
        ]);

        if (cancelled) return;

        const merged = [];

        // Timeline events (stage changes, interviews, communications)
        const timelineData = timelineRes.data?.data || [];
        timelineData.forEach(e => merged.push(e));

        // Notes
        const notes = notesRes.data?.data || [];
        notes.forEach(n =>
          merged.push({ type: 'note', date: n.created_at, ...n })
        );

        // Tags (shown as tag-added events)
        const tags = tagsRes.data?.data || [];
        tags.forEach(t =>
          merged.push({ type: 'tag', date: t.created_at || new Date().toISOString(), ...t })
        );

        // Blacklist
        const bl = blacklistRes.data?.data;
        if (bl) {
          merged.push({ type: 'blacklist', date: bl.created_at, ...bl });
        }

        // Sort newest first
        merged.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEvents(merged);
      } catch (err) {
        console.error('Failed to load timeline', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="py-4 px-1">
      {events.map((event, i) => (
        <EventCard key={`${event.type}-${event.id || i}-${i}`} event={event} />
      ))}
    </div>
  );
}
