# A M World School — Recruitment Tracking Platform

A self-hosted, single-school recruitment management system that tracks applicants
from first contact to final decision.

## Features
- Role-based access (super_admin, admin, hr, panel_member, viewer)
- Vacancy management with Kanban pipeline boards
- Candidate management with duplicate detection
- Interview scheduling with panel evaluations
- Offer tracking and communication logging
- Dashboard analytics, export/import, global search

## Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router v7
- **Backend:** Express (Vercel serverless), JWT auth
- **Database:** SQLite via sql.js (WASM)

## Local development
```bash
npm run install:all
npm run db:init
npm run dev
```

## Live
https://recruitment-tracker-azure.vercel.app

Login credentials are provided separately — do not commit them to version control.
