# Insight Blend — Internal Social Media CRM

Insight Blend is a centralized internal workspace for an organic social media marketing agency to manage clients, monthly content production workflows, assignments, deadlines, and script review/revision loops.

## Monorepo Architecture

The repository is organized as an npm workspaces monorepo:

```
insight_blend_crm_new/
├── backend/          # Node.js + Express + TypeScript API server
│   ├── src/
│   │   ├── config/   # Environment variable parsing and validation (Zod)
│   │   ├── routes/   # Express routes and controllers
│   │   ├── app.ts    # Express application setup
│   │   └── server.ts # Server startup listener
│   └── tests/        # Vitest unit and integration test suite
├── frontend/         # Next.js (App Router) + Tailwind CSS + TypeScript
│   └── src/
│       ├── app/      # Next.js App Router pages and layouts
│       └── config/   # Frontend environment validation
├── docs/             # Requirements, workflow diagrams, and progress trackers
├── package.json      # Root workspaces orchestrator
└── README.md
```

### Architectural Guardrails
- **Backend-Enforced RBAC:** All authorization and business logic live in `/backend`. Next.js API routes are NOT used for core business logic.
- **Three User Roles:** `MANAGER`, `STRATEGIST` (Social Media Strategist/Manager), and `WRITER` (Script Writer).
- **Decoupled Deployment:** Backend deploys to Render, Frontend deploys to Vercel, Database is PostgreSQL on Neon.

---

## Getting Started

### Prerequisites
- Node.js (v20+ or v22 LTS recommended)
- npm (v10+)

### 1. Installation
Install all root, backend, and frontend dependencies from the root directory:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to the required locations:
```bash
# In backend/
cp .env.example backend/.env

# In frontend/
cp .env.example frontend/.env.local
```

#### Environment Variables
| Variable | Location | Description | Default |
|---|---|---|---|
| `PORT` | Backend | HTTP port for Express server | `5000` |
| `NODE_ENV` | Backend | Runtime environment (`development`, `test`, `production`) | `development` |
| `CORS_ORIGIN` | Backend | Allowed CORS origin for frontend | `http://localhost:3000` |
| `DATABASE_URL` | Backend | PostgreSQL connection string (Neon) | (Set in DB milestone) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL | `http://localhost:5000` |

---

## Available Scripts

Run these scripts from the repository root:

- **`npm run dev:backend`**: Start the backend Express server with hot-reload via `tsx watch`.
- **`npm run dev:frontend`**: Start the Next.js frontend development server on `http://localhost:3000`.
- **`npm run build`**: Build both backend and frontend applications.
- **`npm run typecheck`**: Run TypeScript compiler checks (`tsc --noEmit`) across both workspaces.
- **`npm run lint`**: Run ESLint across both workspaces.
- **`npm run test`**: Run the test suite (Vitest) in the backend.

---

## Health Check Endpoint
The backend exposes a health check endpoint for monitoring, load balancers, and deployment verification:
- `GET /api/health` (also accessible at `/health`)
- Response:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-23T00:00:00.000Z",
    "uptime": 12.34,
    "environment": "development"
  }
  ```
