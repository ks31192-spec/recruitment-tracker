import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import GlobalSearch from './components/GlobalSearch.jsx';
import Layout from './components/Layout.jsx';
import PWAPrompt from './components/PWAPrompt.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import CareersPage from './pages/CareersPage.jsx';
import PublicApply from './pages/PublicApply.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vacancies from './pages/Vacancies.jsx';
import VacancyForm from './pages/VacancyForm.jsx';
import VacancyDetail from './pages/VacancyDetail.jsx';
import Candidates from './pages/Candidates.jsx';
import CandidateForm from './pages/CandidateForm.jsx';
import CandidateDetail from './pages/CandidateDetail.jsx';
import Interviews from './pages/Interviews.jsx';
import InterviewCalendar from './pages/InterviewCalendar.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Analytics from './pages/Analytics.jsx';
import KanbanBoard from './pages/KanbanBoard.jsx';
import Reports from './pages/Reports.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Referrals from './pages/Referrals.jsx';
import CandidatePortal from './pages/CandidatePortal.jsx';
import Duplicates from './pages/Duplicates.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Settings from './pages/Settings.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <PWAPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/careers/:vacancyId" element={<PublicApply />} />
        <Route path="/portal" element={<CandidatePortal />} />
        <Route path="/" element={<ProtectedRoute><GlobalSearch /><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vacancies" element={<Vacancies />} />
          <Route path="vacancies/new" element={<VacancyForm />} />
          <Route path="vacancies/:id/edit" element={<VacancyForm />} />
          <Route path="vacancies/:id" element={<VacancyDetail />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/new" element={<CandidateForm />} />
          <Route path="candidates/:id/edit" element={<CandidateForm />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="interviews/calendar" element={<InterviewCalendar />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
