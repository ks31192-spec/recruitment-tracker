-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin','admin','hr','panel_member','viewer')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Designations
CREATE TABLE IF NOT EXISTS designations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE
);

-- Vacancies
CREATE TABLE IF NOT EXISTS vacancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  designation_id INTEGER REFERENCES designations(id),
  subject TEXT,
  qualification_required TEXT,
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  salary_range_min INTEGER,
  salary_range_max INTEGER,
  positions_count INTEGER NOT NULL DEFAULT 1,
  positions_filled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','interviewing','filled','closed','reopened')),
  academic_year_id INTEGER REFERENCES academic_years(id),
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_year ON vacancies(academic_year_id);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  father_or_husband_name TEXT,
  gender TEXT CHECK(gender IN ('male','female','other')),
  date_of_birth TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  current_city TEXT,
  current_state TEXT,
  photo_path TEXT,
  resume_path TEXT,
  source TEXT CHECK(source IN ('walk_in','naukri','whatsapp','referral','website','direct_call','other')),
  referrer_name TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(full_name, father_or_husband_name);

-- Candidate Qualifications
CREATE TABLE IF NOT EXISTS candidate_qualifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  degree TEXT,
  specialization TEXT,
  university TEXT,
  year_of_passing INTEGER,
  percentage_or_cgpa TEXT,
  is_bed INTEGER NOT NULL DEFAULT 0,
  is_deled INTEGER NOT NULL DEFAULT 0,
  ctet_score REAL,
  stet_score REAL,
  net_qualified INTEGER NOT NULL DEFAULT 0
);

-- Candidate Experience
CREATE TABLE IF NOT EXISTS candidate_experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  school_name TEXT,
  designation TEXT,
  from_date TEXT,
  to_date TEXT,
  reason_for_leaving TEXT,
  reference_contact TEXT
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  vacancy_id INTEGER NOT NULL REFERENCES vacancies(id),
  applied_date TEXT NOT NULL DEFAULT (date('now')),
  current_stage TEXT NOT NULL DEFAULT 'applied' CHECK(current_stage IN (
    'applied','shortlisted','interview_scheduled','interview_done',
    'demo_scheduled','demo_done','selected','offer_made',
    'joined','declined','no_response','rejected','waitlisted'
  )),
  waitlist_expiry_date TEXT,
  rejection_reason TEXT,
  decline_reason TEXT,
  salary_expected INTEGER,
  earliest_join_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(candidate_id, vacancy_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(current_stage);

-- Application Stage History
CREATE TABLE IF NOT EXISTS application_stage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  interview_type TEXT NOT NULL CHECK(interview_type IN ('interview','demo')),
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT,
  mode TEXT CHECK(mode IN ('in_person','online')),
  location_or_link TEXT,
  demo_topic TEXT,
  demo_class TEXT,
  demo_duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','no_show','cancelled','rescheduled')),
  rescheduled_from_id INTEGER REFERENCES interviews(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Interview Panel
CREATE TABLE IF NOT EXISTS interview_panel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(interview_id, user_id)
);

-- Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  evaluator_id INTEGER NOT NULL REFERENCES users(id),
  subject_knowledge INTEGER CHECK(subject_knowledge BETWEEN 1 AND 10),
  communication INTEGER CHECK(communication BETWEEN 1 AND 10),
  teaching_aptitude INTEGER CHECK(teaching_aptitude BETWEEN 1 AND 10),
  confidence_personality INTEGER CHECK(confidence_personality BETWEEN 1 AND 10),
  tech_comfort INTEGER CHECK(tech_comfort BETWEEN 1 AND 10),
  overall_impression INTEGER CHECK(overall_impression BETWEEN 1 AND 10),
  strengths TEXT,
  concerns TEXT,
  recommendation TEXT CHECK(recommendation IN ('strong_yes','yes','maybe','no')),
  private_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(interview_id, evaluator_id)
);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  designation_offered TEXT,
  salary_offered INTEGER,
  joining_date_proposed TEXT,
  offer_date TEXT NOT NULL DEFAULT (date('now')),
  response TEXT NOT NULL DEFAULT 'pending' CHECK(response IN ('pending','accepted','declined','negotiating')),
  response_date TEXT,
  decline_reason TEXT,
  actually_joined INTEGER NOT NULL DEFAULT 0,
  actual_joining_date TEXT,
  left_during_probation INTEGER NOT NULL DEFAULT 0,
  probation_leave_date TEXT,
  probation_leave_reason TEXT,
  notes TEXT
);

-- Communication Log
CREATE TABLE IF NOT EXISTS communication_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  application_id INTEGER REFERENCES applications(id),
  comm_type TEXT NOT NULL CHECK(comm_type IN ('call','whatsapp','email','sms','in_person')),
  direction TEXT NOT NULL CHECK(direction IN ('incoming','outgoing')),
  summary TEXT,
  outcome TEXT,
  follow_up_date TEXT,
  logged_by INTEGER REFERENCES users(id),
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comm_followup ON communication_log(follow_up_date);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('resume','certificate','id_proof','experience_letter','photo','other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
