# Stroyka — Construction Control Desktop System

## Stack

- **Desktop shell:** Tauri + Rust
- **Frontend:** TypeScript + lit-html + Vite
- **Charts:** Apache ECharts
- **3D:** Three.js
- **Backend:** NestJS + Prisma + PostgreSQL
- **Package manager:** Bun (all installs/scripts use bun)

## Project Structure

```
stroyka/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/            # Login, register, JWT
│   │   ├── users/           # User CRUD
│   │   ├── projects/        # Project CRUD + assignments
│   │   ├── estimates/       # Estimate import
│   │   ├── estimate-lines/  # Estimate line items
│   │   ├── warehouse/       # Warehouse items
│   │   ├── warehouse-transactions/  # Stock movements
│   │   ├── material-requests/       # Material request flow
│   │   ├── brigades/        # Brigade management
│   │   ├── work-logs/       # Brigade work logs
│   │   ├── machines/        # Machine registry
│   │   ├── machine-logs/    # Machine hour logs
│   │   ├── dashboard/       # Summary/aggregations
│   │   ├── alerts/          # Alert system
│   │   ├── reports/         # Excel export
│   │   ├── zones/           # 3D zones
│   │   ├── audit-log/       # Audit trail
│   │   ├── common/          # Guards, decorators
│   │   └── prisma/          # Prisma service
│   ├── prisma/
│   │   ├── schema.prisma    # Full data model
│   │   └── seed.ts          # Demo data
│   ├── .env
│   └── Dockerfile
├── frontend/                # Tauri + lit-html
│   ├── src/
│   │   ├── app/             # main.ts, router, state
│   │   ├── components/      # Sidebar, tables, charts, 3D
│   │   ├── pages/           # login, dashboard, estimate, warehouse, brigades, reports
│   │   ├── services/        # api.ts, auth.ts
│   │   └── styles/          # main.css
│   ├── src-tauri/           # Rust/Tauri config
│   ├── index.html
│   └── vite.config.ts
└── docker-compose.yml       # PostgreSQL + backend
```

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

### 2. Setup Backend

```bash
cd backend
bun install
bunx prisma db push     # create tables
bun run prisma/seed     # seed demo data
bun run dev             # starts on http://localhost:3000
```

### 3. Setup Frontend

```bash
cd frontend
bun install
bun run dev             # starts on http://localhost:5173
```

### 4. Build Desktop App

```bash
cd frontend
bun run tauri build     # builds native app for current OS
```

### 5. Build Windows App

Build on Windows machine:

```bash
cd frontend
bun run tauri:build:windows
```

Cross-build from macOS/Linux to Windows NSIS installer:

```bash
brew install nsis llvm   # macOS
cargo install --locked cargo-xwin
rustup target add x86_64-pc-windows-msvc

cd frontend
bun run tauri:build:windows:cross
```

## Demo Credentials

| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | ADMIN |
| proab    | proab123  | PROAB |

## Role Permissions

- **ADMIN:** Full access — prices, costs, financial reports, user management
- **PROAB:** Operational only — no financial data, assigned projects only

## API Endpoints (96 routes)

- `/auth` — login, register, me
- `/users` — user CRUD
- `/projects` — project management
- `/estimates` — estimate import
- `/estimate-lines` — line items
- `/warehouse` — warehouse items
- `/warehouse-transactions` — stock movements with confirm/reject
- `/material-requests` — request flow with approve/reject
- `/brigades` — brigade management
- `/work-logs` — brigade work logs
- `/machines` — machine registry
- `/machine-logs` — machine hour logs
- `/dashboard` — summary aggregates + chart data
- `/alerts` — alert system
- `/reports` — Excel export
- `/zones` — 3D zones
- `/audit-log` — audit trail
