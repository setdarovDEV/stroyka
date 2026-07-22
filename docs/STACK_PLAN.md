# Construction Control Desktop System — Detailed Handoff Plan

## 1. Product Summary

Build a locally installed desktop application for construction project control.

The system is for construction owners, directors, investors, accountants, developers, proabs, engineers, and warehouse-responsible staff. Its main purpose is to compare the construction estimate against real execution: materials, money, warehouse balance, worker hours, machine hours, brigade progress, risks, alerts, and reports.

The application must feel like a fast business tool, closer to 1C or Excel than a marketing website. The UI should be table-heavy, direct, and operational.

Important latest decisions:

- Use Tauri, not Electron.
- Use React, not `lit-html` (decision changed to React).
- Didox integration is not needed.
- The dashboard must include a simple 3D visual prototype of the building.
- The dashboard must include many charts.
- First version should support Windows and macOS.
- The plan and implementation docs should be in English.
- UI language can later be Uzbek/Russian, but internal code names and technical docs should stay English.

## 2. Core Users and Roles

There are only two application roles in the first version.

### 2.1 Admin / Director Role

This role represents:

- Investor
- Director
- Developer
- Accountant
- Project owner / manager

Admin can see everything:

- Projects / construction objects
- Full estimate
- Prices
- Planned cost
- Actual cost
- Cost overruns
- Warehouse quantities
- Supplier/contract information
- Brigade status
- Worker and machine hours
- Reports
- Alerts
- Progress charts
- 3D building progress view
- Approval flows

Admin can:

- Create projects.
- Upload estimates.
- Review imported estimate data.
- Approve or reject material requests.
- View cost and financial deviation.
- Export reports.
- See all dashboard warnings.
- Manage users and project assignments.

### 2.2 Proab / Engineer Role

This role represents:

- Proab
- Engineer
- Site manager
- Warehouse-responsible user, if needed

Proab has restricted access.

Proab can see:

- Only assigned project/object.
- Estimate quantities needed for work.
- Materials that should be used.
- Materials already used.
- Warehouse stock quantities.
- Units such as pieces, cubic meters, tons, meters, bags, hours.
- Brigade/task-related progress where relevant.
- Non-financial alerts.

Proab must not see:

- Material prices.
- Planned cost.
- Actual cost.
- Financial variance.
- Profit/loss.
- Investor-level financial reports.

Proab can:

- Request materials.
- Confirm incoming materials before they become usable stock.
- Register material outgoing/usage.
- Register work progress.
- Register worker hours.
- Register machine/crane hours.
- Export or view only permitted operational data.

## 3. Recommended Technical Stack

### 3.1 Desktop Shell

Use:

- Tauri
- Rust side for desktop-native operations
- TypeScript frontend
- `lit-html` for rendering

Reason:

- Smaller app size than Electron.
- Better native performance.
- Better fit for desktop installed app.
- Lower memory usage.
- Good Windows/macOS packaging.

### 3.2 Frontend

Use:

- TypeScript
- React 19
- Vite 5
- Tailwind CSS for styling
- shadcn/ui component system
- React Router v7 for routing

Frontend responsibilities:

- Render pages and layouts.
- Render large tables.
- Render dashboard charts.
- Render 3D building prototype.
- Handle user interactions.
- Call backend API.
- Call Tauri commands when desktop-native access is needed.

Recommended frontend libraries:

- React 19 for UI framework.
- Apache ECharts for charts (lazy-loaded).
- Three.js for 3D (lazy-loaded).
- SheetJS or ExcelJS for frontend-side Excel preview if needed.

### 3.3 3D Visualization

Use:

- Three.js directly.

Do not use:

- React Three Fiber.
- BIM/IFC support in MVP.
- Heavy photorealistic rendering.

MVP 3D approach:

- Build a simple visual prototype from floors, blocks, sections, or zones.
- Each section represents a construction phase, floor, area, or work package.
- Each section has a progress/status color.
- Clicking a section shows related estimate lines, warehouse usage, alerts, and reports.

### 3.4 Charts

Use:

- Apache ECharts.

Reason:

- Strong business dashboard support.
- Handles many chart types.
- Good performance.
- Works without React.

Required chart categories:

- Planned vs actual cost.
- Planned vs actual material usage.
- Warehouse balance and stock risk.
- Construction progress by phase.
- Monthly/quarterly spending.
- Worker hours.
- Machine/crane hours.
- Brigade productivity.
- Alerts by severity/type.

### 3.5 Backend

Use:

- NestJS
- TypeScript
- REST API for MVP
- WebSocket or server-sent events later if live updates are required

Reason:

- Structured backend.
- Good module separation.
- Good validation/auth patterns.
- Works well with Prisma/PostgreSQL.
- Easier for another agent/developer to extend.

All modules implemented: auth, users, projects, estimates, estimate-lines, warehouse, warehouse-transactions, material-requests, brigades, work-logs, machines, machine-logs, dashboard, alerts, reports, zones, audit-log.

Alternative:

- If the app becomes single-machine only, some backend logic can move into Tauri/Rust with SQLite.
- However, PostgreSQL + API is recommended because the product needs multiple users, approvals, roles, and reporting.

### 3.6 Database

Use:

- PostgreSQL
- Prisma ORM

Reason:

- Multi-user safe.
- Good relational model for estimates, warehouse transactions, reports, and approvals.
- Better than SQLite for shared project data.

SQLite may be used only as a future offline/local fallback, not as the main production database unless the product scope becomes single-computer only.

### 3.7 File Import/Export

Use:

- SheetJS or ExcelJS.

Required:

- Excel estimate import.
- CSV fallback import.
- Excel warehouse export.
- Excel reports export.
- Later PDF reports if needed.

### 3.8 Packaging and Deployment

Use:

- Tauri bundler for Windows/macOS installers.
- Docker Compose for backend + PostgreSQL if deployed on a local server or VPS.

Recommended deployment model:

- Desktop app installed on Windows/macOS user computers.
- One shared backend/database runs on a company server, main office computer, or private VPS.
- Desktop apps connect to that backend.

This allows:

- Multiple users.
- Live shared warehouse state.
- Admin/proab approval flow.
- Centralized reporting.

## 4. Main Application Navigation

After login, the application should have these main sections:

1. Dashboard
2. Estimate
3. Warehouse
4. Brigades
5. Reports

Optional later sections:

- Settings
- Users
- Projects
- Integrations
- Audit Log

## 5. First Launch / Initial Setup Flow

When a new project is opened and no estimate exists, the app must clearly prompt:

> Upload estimate

The estimate upload is the starting point because most planned quantities, planned costs, phases, and material expectations come from it.

Required first setup steps:

1. Create/open project.
2. Upload estimate file.
3. Parse Excel/CSV.
4. Preview detected rows.
5. Show validation problems.
6. Let Admin confirm import.
7. Generate initial estimate records.
8. Initialize dashboard, warehouse expectations, phases, and alerts from imported data.

The importer must support flexible table structures because real construction estimates may not always have the exact same format.

Minimum importer behavior:

- Accept `.xlsx`.
- Accept `.xls` if library supports it reliably.
- Accept `.csv`.
- Detect columns by header names where possible.
- Allow manual column mapping if automatic detection fails.
- Validate each row before final import.
- Show row-level errors.
- Do not silently skip important data.

Expected estimate fields:

- Code
- Name
- Category
- Construction phase
- Unit
- Planned quantity
- Planned unit price, Admin-only
- Planned total price, Admin-only
- Work type
- Floor/zone/section if available
- Worker-hour amount if row represents labor
- Machine-hour amount if row represents machinery
- Notes

## 6. Dashboard Requirements

The dashboard is the main control center.

It must combine:

- 3D visual building prototype.
- Charts.
- Alerts.
- Construction progress.
- Estimate vs actual comparison.
- Warehouse risks.
- Labor and machine tracking.

### 6.1 Dashboard Metrics

Show:

- Overall project progress percentage.
- Planned project progress percentage.
- Actual project progress percentage.
- Planned cost up to current progress, Admin-only.
- Actual cost up to current progress, Admin-only.
- Cost variance, Admin-only.
- Planned material usage.
- Actual material usage.
- Material overuse/underuse.
- Current warehouse value, Admin-only.
- Current warehouse quantities.
- Worker hours planned vs actual.
- Machine/crane hours planned vs actual.
- Brigade progress.
- Number of active alerts.

### 6.2 Progress Logic

The dashboard should answer questions like:

- If the construction is 50% complete, how much material should have been used by now?
- How much material was actually used?
- How much money should have been spent by now?
- How much money was actually spent?
- Which phase is consuming more than planned?
- Which warehouse items are running out?
- Which materials are unused for too long?
- Which materials are in transit?

### 6.3 Alerts

Dashboard alerts should include:

- Material overuse compared to estimate.
- Material shortage.
- Material excess.
- Material unused for a long time.
- Material in transit.
- Delivery delay.
- Brigade behind plan.
- Worker hours over plan.
- Machine/crane hours over plan.
- Phase cost overrun, Admin-only.
- Estimate deviation.
- Missing required data.

Alert severity:

- Info
- Warning
- Critical

Alert status:

- New
- Acknowledged
- Resolved

### 6.4 Dashboard Charts

Include many charts, but keep them practical.

Recommended MVP charts:

- Cost planned vs actual over time, Admin-only.
- Material planned vs actual by category.
- Warehouse stock level by material.
- Low-stock risk chart.
- Progress by construction phase.
- Brigade productivity by week/month.
- Worker hours planned vs actual.
- Machine/crane hours planned vs actual.
- Top 10 overused materials.
- Top 10 unused/excess materials.
- Alert count by type and severity.

Do not render all heavy charts at once if performance suffers. Use tabs, lazy loading, and pagination.

### 6.5 3D Building Prototype

MVP 3D is not BIM.

It is a simple visual model used to understand construction progress quickly.

Represent the building as:

- Floors
- Sections
- Zones
- Blocks
- Construction phases

Each 3D element should have:

- ID
- Name
- Phase
- Floor/zone
- Progress percentage
- Status
- Linked estimate rows
- Linked warehouse usage
- Linked alerts

Status colors:

- Gray: not started
- Blue: in progress
- Green: completed
- Yellow/orange: delayed or warning
- Red: over budget, over material limit, or critical problem

Interactions:

- Rotate/pan/zoom model.
- Hover section to show quick tooltip.
- Click section to open detail panel.
- Detail panel shows phase, progress, planned vs actual quantities, cost if Admin, and alerts.

Future upgrade path:

- Upload GLB/GLTF model.
- Map model objects to project zones/phases.
- Later, if required, consider IFC/BIM support.

Do not include IFC/BIM support in MVP.

## 7. Estimate Module

The Estimate section shows the full imported construction estimate.

It must include all materials and work items from beginning to final handover:

- Excavation
- Foundation
- Concrete
- Rebar
- Masonry
- Electrical
- Plumbing
- Sewage
- Facade
- Roofing
- Finishing
- Equipment
- Labor
- Machine/crane hours
- Other project-specific phases

### 7.1 Estimate Table

Columns should include:

- Code
- Name
- Category
- Phase
- Floor/zone/section
- Unit
- Planned quantity
- Used quantity
- Remaining quantity
- Unit price, Admin-only
- Planned total, Admin-only
- Actual total, Admin-only
- Variance, Admin-only
- Status
- Notes

Required behavior:

- Search.
- Filter.
- Sort.
- Group by phase/category/floor.
- Show material/work codes such as `P.1.34`.
- Highlight overused items.
- Hide financial columns from Proab.
- Link rows to warehouse items and 3D zones where possible.

### 7.2 Estimate Import Validation

Validation must check:

- Required fields exist.
- Quantity is numeric.
- Unit is present.
- Code is unique or handled safely.
- Price fields are numeric if provided.
- Rows can be mapped to material/labor/machine categories.

Import result should show:

- Total rows found.
- Rows imported.
- Rows with warnings.
- Rows with errors.
- Downloadable/importable error report if needed.

## 8. Warehouse Module

The Warehouse section tracks current material stock and all movements.

Core formula:

```text
Current balance = opening balance + incoming - outgoing
```

Warehouse must be transaction-based. Do not store only editable balances without history.

### 8.1 Warehouse Table

Columns should include:

- Material code
- Material name
- Category
- Unit
- Current balance
- Reserved quantity
- Available quantity
- Planned total from estimate
- Used quantity
- Remaining estimate quantity
- Supplier
- Contract
- Delivery status
- In-transit quantity
- Expected arrival date
- Estimated days remaining
- Last movement date
- Status

Financial columns such as value/price must be Admin-only.

### 8.2 Warehouse Transactions

Transaction types:

- Opening balance
- Incoming
- Outgoing/usage
- Return
- Adjustment
- Transfer, optional later

Each transaction should store:

- Project
- Material
- Quantity
- Unit
- Type
- Date
- Source/destination
- Related estimate line if applicable
- Related brigade/phase/zone if applicable
- Created by
- Approved/confirmed by, if applicable
- Notes

### 8.3 Incoming Confirmation Flow

When new material arrives:

1. User creates incoming record.
2. Record is pending.
3. Proab or authorized user confirms actual received quantity.
4. Confirmed quantity is added to usable warehouse stock.
5. Differences are logged.

The system must not treat unconfirmed incoming material as usable stock.

### 8.4 Warehouse Alerts

Warehouse alerts:

- Low stock.
- Out of stock.
- Excess stock.
- Unused stock.
- Delivery overdue.
- Material used more than estimate limit.
- Material has no estimate mapping.
- Unit mismatch.

### 8.5 Warehouse Export

User must be able to export current warehouse state as a table:

- Excel format first.
- CSV optional.
- Admin export includes financial columns.
- Proab export excludes financial columns.

## 9. Brigade Module

The Brigades section tracks worker teams and progress.

Brigade examples:

- Concrete workers
- Rebar workers
- Electricians
- Plumbing team
- Facade team
- General workers
- Machine operators

### 9.1 Brigade Data

Store:

- Brigade name
- Type
- Project assignment
- Number of workers
- Responsible person
- Start date
- End date or expected end date
- Payment schedule
- Current status
- Planned progress
- Actual progress
- Notes

### 9.2 Work Logs

Track:

- Date
- Brigade
- Phase
- Zone/floor/section
- Work description
- Worker count
- Hours worked
- Output/progress
- Related estimate line
- Created by

### 9.3 Brigade Control

The system should show:

- How many brigades exist.
- Which brigades are active on object.
- Which brigades are behind plan.
- When salary/payment is due.
- Planned vs actual progress.
- Worker hours planned vs actual.

Financial salary details should be Admin-only unless explicitly allowed later.

## 10. Reports Module

Reports must be exportable.

Required time periods:

- Monthly
- Quarterly
- Half-year
- Yearly
- Full project since construction start

Required report types:

- General project summary
- Estimate vs actual
- Materials usage
- Warehouse state
- Stock movement
- Brigade/workers
- Machine/crane hours
- Construction phase report
- Financial report, Admin-only
- Alert/risk report

Construction phase reports should support examples like:

- Structural works
- Facade
- Sewage
- Electrical
- Plumbing
- Finishing

Export formats:

- Excel for MVP
- PDF later
- Presentation-style view/share later

Access:

- Admin can access all reports.
- Proab can access only non-financial operational reports for assigned project.
- Shared report links/views should only work for authorized users.

## 11. Integrations

### 11.1 Didox

Didox is excluded.

Do not implement Didox integration.
Do not add Didox as a required module.
Do not make MVP depend on Didox.

### 11.2 1C

1C is optional future scope.

Recommended MVP approach:

- Export Excel reports that accountants can import/use manually.
- Later add direct integration if API/file format requirements are available.

### 11.3 my.soliq.uz / Tax.uz

Tax integration is optional future scope.

Do not block MVP on this integration.

Only add real integration if:

- Official API documentation is available.
- Credentials/sandbox are available.
- Exact data sync requirements are defined.

## 12. Data Model

Recommended core entities:

- User
- Role
- Project
- ProjectUserAssignment
- Estimate
- EstimateLine
- Material
- Unit
- ConstructionPhase
- Zone
- WarehouseItem
- WarehouseTransaction
- Supplier
- Contract
- Delivery
- IncomingConfirmation
- MaterialRequest
- Brigade
- BrigadeAssignment
- BrigadeWorkLog
- Machine
- MachineWorkLog
- Alert
- ReportExport
- AuditLog

### 12.1 User

Fields:

- id
- fullName
- username/email/phone
- passwordHash
- role
- status
- createdAt
- updatedAt

### 12.2 Project

Fields:

- id
- name
- address
- client/investor name
- startDate
- plannedEndDate
- status
- createdAt
- updatedAt

### 12.3 EstimateLine

Fields:

- id
- estimateId
- projectId
- code
- name
- category
- phaseId
- zoneId
- unitId
- plannedQuantity
- usedQuantity, derived or cached
- remainingQuantity, derived or cached
- plannedUnitPrice, Admin-only
- plannedTotalPrice, Admin-only
- itemType: material/labor/machine/service/other
- notes

### 12.4 Material

Fields:

- id
- code
- name
- category
- defaultUnitId
- description

### 12.5 WarehouseTransaction

Fields:

- id
- projectId
- materialId
- estimateLineId, nullable
- zoneId, nullable
- phaseId, nullable
- type
- quantity
- unitId
- transactionDate
- status
- createdByUserId
- confirmedByUserId, nullable
- supplierId, nullable
- contractId, nullable
- deliveryId, nullable
- notes
- createdAt

### 12.6 Alert

Fields:

- id
- projectId
- type
- severity
- title
- message
- relatedEntityType
- relatedEntityId
- status
- createdAt
- resolvedAt

### 12.7 Zone

Used for 3D prototype and construction progress.

Fields:

- id
- projectId
- name
- floor
- section
- phaseId
- progressPercent
- status
- geometryType
- geometryConfigJson
- createdAt
- updatedAt

`geometryConfigJson` can define simple block dimensions/position/color mapping for Three.js.

## 13. Permissions

All backend endpoints must enforce role permissions.

Do not rely only on frontend hiding.

Admin:

- Full project access if assigned/admin.
- Can view prices/costs.
- Can export financial reports.
- Can manage users and projects.
- Can approve/reject requests.

Proab:

- Only assigned projects.
- No prices.
- No financial totals.
- Can create material requests.
- Can confirm incoming materials if authorized.
- Can register usage/work logs.
- Can view non-financial dashboard and reports.

Financial fields must be stripped from backend responses for Proab users, not only hidden in UI.

## 14. API Design Direction

Use REST for MVP.

Recommended endpoint groups:

- `/auth`
- `/users`
- `/projects`
- `/estimates`
- `/estimate-lines`
- `/warehouse`
- `/warehouse-transactions`
- `/material-requests`
- `/brigades`
- `/work-logs`
- `/machines`
- `/machine-logs`
- `/dashboard`
- `/alerts`
- `/reports`
- `/zones`

Important API principles:

- Validate all input DTOs.
- Enforce permissions server-side.
- Return paginated tables.
- Support search/filter/sort in large tables.
- Do not return financial fields to Proab.
- Keep dashboard summary endpoints separate from raw table endpoints.

## 15. Frontend Architecture

Suggested folder structure:

```text
src/
  app/
    main.tsx
    context.tsx
  components/
    layout/
      app-layout.tsx
      sidebar.tsx
      protected-route.tsx
    ui/
      badge.tsx
      button.tsx
      card.tsx
      dialog.tsx
      input.tsx
      label.tsx
      progress.tsx
      select.tsx
      separator.tsx
      table.tsx
      tabs.tsx
      textarea.tsx
    forms/
    tables/
    charts/
    3d/
  pages/
    login/
    register/
    dashboard/
    estimate/
    warehouse/
    brigades/
    reports/
    settings/
    users/
    projects/
    alerts/
  services/
    api.ts
    auth.ts
  hooks/
  styles/
    globals.css
  lib/
    utils.ts
```

Rendering:

- Use React functional components with hooks.
- Keep components small.
- Use TanStack Table or shadcn/ui Table for data tables.
- For large tables, use pagination or virtualization.
- Lazy-load heavy dashboard modules such as Three.js and ECharts.

State:

- Keep auth/session state in React Context (AppProvider).
- Keep page-specific filters/sort/pagination local to page components.
- Use React state (useState/useCallback/useEffect) for local state management.

Styling:

- Tailwind CSS for all styling.
- shadcn/ui conventions for component composition (cn() utility with clsx + tailwind-merge).
- Dark theme by default matching the operational/industrial feel.

## 16. Backend Architecture

Suggested NestJS modules:

- AuthModule
- UsersModule
- ProjectsModule
- EstimatesModule
- WarehouseModule
- BrigadesModule
- MachinesModule
- DashboardModule
- AlertsModule
- ReportsModule
- ZonesModule
- AuditLogModule

Backend responsibilities:

- Authentication.
- Authorization.
- Data validation.
- Business rules.
- Import processing.
- Stock calculations.
- Dashboard calculations.
- Report generation.
- Audit logging.

Do not put core business rules only in the frontend.

## 17. Business Rules

### 17.1 Stock Balance

Stock is calculated from transactions:

```text
balance = opening + incoming + returns + adjustments_positive - outgoing - adjustments_negative
```

Confirmed incoming only counts as usable stock.

### 17.2 Estimate Overuse

If actual used quantity is greater than planned estimate quantity:

- Mark row as overused.
- Create alert.
- Show red status.
- Show on dashboard.

Admin sees cost impact.
Proab sees quantity impact only.

### 17.3 Progress Cost Calculation

Admin dashboard should compare:

- Planned cost for current progress.
- Actual cost for current progress.
- Variance.

Progress may initially be manually entered per phase/zone.

Later, progress can be calculated from completed work logs and estimate lines.

### 17.4 Role-Based Financial Visibility

Financial fields:

- Unit price
- Total price
- Actual cost
- Cost variance
- Warehouse value
- Salary/payment values

These must not be returned to Proab API responses.

## 18. MVP Scope

MVP must include:

- Tauri desktop shell. [DONE]
- React frontend with TypeScript and Tailwind. [DONE]
- shadcn/ui component system. [DONE]
- Login. [DONE]
- Register page.
- Two roles. [DONE]
- Project creation/opening. [DONE - backend]
- Project management UI. [NEEDED]
- User management UI. [NEEDED]
- Estimate upload/import (Excel + JSON). [PARTIAL - JSON only]
- Estimate column mapping UI. [NEEDED]
- Estimate table. [DONE]
- Warehouse table. [DONE]
- Warehouse transactions. [DONE]
- Incoming confirmation flow. [NEEDED]
- Material request flow. [PARTIAL - backend done, UI needed]
- Brigade list and work logs. [PARTIAL - UI for creation needed]
- Machine/crane hour logs. [PARTIAL - UI for creation needed]
- Dashboard with charts. [PARTIAL - hardcoded, needs live data]
- Dashboard with simple 3D building prototype. [DONE - basic, needs zone interactivity]
- Alerts management UI. [NEEDED]
- Excel report export. [DONE - needs download to client]
- Report download to client. [NEEDED]
- Windows/macOS packaging. [NEEDED - Tauri build]
- Settings page. [NEEDED]
- Zone management for 3D. [NEEDED]
- Audit log integration. [NEEDED]

MVP excludes:

- Didox.
- Full BIM/IFC.
- Photorealistic 3D.
- Complex accounting.
- Full tax integration.
- Full 1C integration.
- Mobile app.

## 19. Future Scope

Possible future features:

- GLB/GLTF model upload.
- BIM/IFC support.
- 1C integration.
- Tax/my.soliq.uz integration.
- PDF reports.
- Presentation share links.
- Offline sync.
- Mobile companion app.
- Advanced project scheduling.
- Contractor payment management.
- OCR import for invoices/documents.

## 20. Testing Plan

### 20.1 Import Tests

Test:

- Valid Excel import.
- Valid CSV import.
- Missing required columns.
- Invalid quantity.
- Invalid price.
- Duplicate codes.
- Manual column mapping.
- Row-level error display.

### 20.2 Permission Tests

Test:

- Admin sees financial data.
- Proab does not receive financial data from API.
- Proab cannot access unassigned projects.
- Proab cannot export financial reports.
- Admin can approve/reject requests.

### 20.3 Warehouse Tests

Test:

- Opening balance.
- Incoming pending does not count as usable stock.
- Confirmed incoming updates balance.
- Outgoing decreases balance.
- Overuse creates alert.
- Export excludes financial data for Proab.

### 20.4 Dashboard Tests

Test:

- Planned vs actual material chart.
- Planned vs actual cost chart for Admin.
- Cost chart hidden for Proab.
- Alert counts.
- Progress by phase.
- Worker hours chart.
- Machine hours chart.

### 20.5 3D Tests

Test:

- 3D model loads.
- Zones render with correct colors.
- Hover shows tooltip.
- Click opens detail panel.
- Progress/status updates after data changes.
- 3D module lazy-loads.

### 20.6 Report Tests

Test:

- Monthly report export.
- Quarterly report export.
- Full project report export.
- Phase report export.
- Warehouse report export.
- Brigade report export.
- Financial report restricted to Admin.

### 20.7 Desktop Packaging Tests

Test:

- Windows installer builds.
- macOS installer builds.
- App starts after install.
- App can connect to backend.
- App handles backend unavailable state clearly.

## 21. Performance Requirements

The app must feel fast with large construction tables.

Guidelines:

- Paginate or virtualize large tables.
- Lazy-load Three.js.
- Lazy-load ECharts.
- Avoid rendering all dashboard charts at once.
- Debounce search inputs.
- Use backend filtering/sorting for large datasets.
- Cache dashboard summaries when safe.
- Avoid expensive recalculation on every UI interaction.

Target behavior:

- Page navigation should feel immediate.
- Table filtering should respond quickly.
- Dashboard should show skeleton/loading states for heavy widgets.
- 3D should not block the whole dashboard.

## 22. Security and Audit

Required:

- Password hashing.
- Auth token/session handling.
- Role-based authorization.
- Server-side permission enforcement.
- Audit log for important actions.

Audit log should include:

- Estimate import.
- Warehouse incoming confirmation.
- Warehouse outgoing/adjustment.
- Material request approval/rejection.
- User role changes.
- Report export.

## 23. Implementation Order

Recommended sequence:

1. Scaffold monorepo/app structure. [DONE]
2. Set up Tauri + Vite + TypeScript + React. [DONE]
3. Set up NestJS + PostgreSQL + Prisma. [DONE]
4. Implement auth and roles. [DONE]
5. Implement projects. [DONE - backend]
6. Implement project management UI. [NEEDED]
7. Implement estimate import and estimate table. [PARTIAL]
8. Add Excel file import with column mapping. [NEEDED]
9. Implement warehouse transactions and balances. [DONE]
10. Implement incoming confirmation. [PARTIAL - backend done, UI needed]
11. Implement dashboard summary API. [DONE]
12. Implement dashboard charts with live data. [PARTIAL]
13. Implement simple 3D zone prototype with interactivity. [PARTIAL]
14. Implement brigade and work logs. [PARTIAL - creation UI needed]
15. Implement machine/crane logs. [PARTIAL - creation UI needed]
16. Implement material request UI (approve/reject). [NEEDED]
17. Implement alerts management UI. [NEEDED]
18. Implement user management page. [NEEDED]
19. Implement reports/export with client download. [PARTIAL]
20. Implement register page. [NEEDED]
21. Implement settings page. [NEEDED]
22. Add zone management for 3D. [NEEDED]
23. Add audit log integration. [NEEDED]
24. Add permission hardening (backend financial stripping). [NEEDED]
25. Add tests. [DONE - E2E tests written]
26. Build Windows/macOS installers. [NEEDED]

## 24. Open Decisions for Product Owner

These are not blockers for initial scaffolding but should be resolved early:

- Exact UI language: Uzbek Cyrillic, Uzbek Latin, Russian, or mixed.
- Whether backend/database runs on local company server, VPS, or main office computer.
- Exact estimate template examples.
- Which construction phases should be predefined.
- Who is allowed to confirm incoming materials.
- Whether Proab can create outgoing usage directly or only request/submit it.
- Required report templates.
- Whether salary amounts are visible only to Admin or to selected managers.

## 25. Final Implementation Assumptions

Unless product owner says otherwise, implement with these assumptions:

- Desktop app: Tauri.
- Frontend: TypeScript + React 19.
- 3D: Three.js simple blocks/zones.
- Charts: Apache ECharts.
- Backend: NestJS.
- Database: PostgreSQL.
- ORM: Prisma.
- Import/export: Excel first.
- Roles: Admin and Proab only.
- Didox: excluded.
- BIM/IFC: excluded from MVP.
- Financial data: Admin-only.
- Proab: assigned-project operational access only.
- Package manager: Bun (use bun for all install/run scripts, never npm/yarn/pnpm).
- Styling: Tailwind CSS + shadcn/ui.
