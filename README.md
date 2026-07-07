# Job Tracker

A full-stack job application tracking system built with Next.js, Node.js, Express, and PostgreSQL. Track your job hunt with smart insights, follow-up reminders, and a Kanban pipeline view.

**Live Demo:** https://job-tracker-3nb5.vercel.app

---

## Features

- **Authentication** — Secure register/login with JWT access tokens and refresh tokens
- **Smart Dashboard** — Real-time insights including applications this week, response rate, average days since applying, and follow-up alerts
- **Application Tracking** — Add, edit, delete, and search job applications with fields for company, role, status, salary, location, job URL, and notes
- **Follow-up System** — Set follow-up dates and get highlighted alerts when applications need attention
- **Pipeline View** — Toggle between List and Kanban views to visualize your application pipeline
- **Quick Status Update** — Change application status directly from the dashboard card
- **Export to CSV** — Download all your applications as a spreadsheet
- **Activity Log** — Every status change is recorded in an activity timeline

---

## Tech Stack

### Backend
- **Node.js** + **Express** — REST API
- **TypeScript** — Type safety
- **PostgreSQL** — Database (hosted on Prisma Cloud)
- **Prisma ORM** — Database client and schema management
- **JWT** — Authentication with access + refresh token pattern
- **bcryptjs** — Password hashing

### Frontend
- **Next.js 16** — React framework with App Router
- **TypeScript** — Type safety
- **Zustand** — Client-side state management
- **Axios** — HTTP client with request/response interceptors

### Deployment
- **Railway** — Backend deployment
- **Vercel** — Frontend deployment
- **Prisma Cloud** — Managed PostgreSQL database

---

## Architecture

```
client/                          server/
├── src/                         ├── src/
│   ├── app/                     │   ├── controllers/
│   │   ├── login/               │   │   ├── auth.controller.ts
│   │   ├── register/            │   │   └── application.controller.ts
│   │   └── dashboard/           │   ├── middleware/
│   ├── lib/                     │   │   └── auth.middleware.ts
│   │   └── axios.ts             │   ├── routes/
│   ├── store/                   │   │   ├── auth.routes.ts
│   │   └── auth.store.ts        │   │   └── application.routes.ts
│   └── types/                   │   └── index.ts
│       └── index.ts             ├── prisma/
                                 │   └── schema.prisma
                                 └── prisma.config.ts
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/logout` | Logout and invalidate token |
| POST | `/api/auth/refresh` | Get new access token |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | Get all applications (with search + filter) |
| POST | `/api/applications` | Create a new application |
| GET | `/api/applications/stats` | Get smart dashboard stats |
| GET | `/api/applications/:id` | Get single application |
| PATCH | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |

---

## Database Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String         // bcrypt hashed
  name          String
  applications  Application[]
  refreshTokens RefreshToken[]
}

model Application {
  id           String     @id @default(cuid())
  company      String
  role         String
  status       Status     @default(APPLIED)
  appliedDate  DateTime   @default(now())
  followUpDate DateTime?
  notes        String?
  jobUrl       String?
  salary       String?
  location     String?
  activities   Activity[]
  user         User       @relation(...)
}

enum Status {
  APPLIED
  INTERVIEW
  SELECTED
  OFFER
  REJECTED
  GHOSTED
}
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/TapadiptaRoy/job-tracker.git
cd job-tracker
```

### 2. Set up the server
```bash
cd server
npm install
```

Create `server/.env`:
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
PORT=5000
```

```bash
npx prisma generate
npm run dev
```

### 3. Set up the client
```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:3000`

---

## Key Engineering Decisions

**Why JWT with refresh tokens?**
Short-lived access tokens (15 min) limit damage from token theft. Refresh tokens (7 days) stored in the database can be invalidated on logout, giving full session control.

**Why Prisma over raw SQL?**
Type-safe database queries catch errors at compile time, not runtime. Schema-as-code means the database structure is version controlled alongside the application code.

**Why separate client and server?**
Clean separation of concerns — the backend is a pure REST API that could serve a mobile app, CLI, or any other client. The frontend can be deployed independently on a CDN (Vercel) while the backend runs on a server (Railway).

**Why PostgreSQL?**
Relational data with clear relationships (User → Applications → Activities) fits a relational model well. ACID compliance ensures data integrity for operations like status changes with activity logs.

---

## What I'd Add Next

- Email notifications for follow-up reminders (Nodemailer + cron)
- File upload for attaching resumes/JDs to applications (S3)
- OAuth login (Google)
- Interview prep notes per application
- Analytics charts (application trend over time)
- Mobile app (React Native)

---

## Author

**Tapadipta Roy** — [GitHub](https://github.com/TapadiptaRoy)
