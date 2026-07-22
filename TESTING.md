# Testing Coverage Matrix

Manual browser exploration used Playwright capability search, but Playwright MCP is not exposed in this Codex session. Coverage below is captured in permanent Playwright tests under `frontend/tests/`.

## Last Run

Command: `cd frontend && bun run test:e2e -- --headed`

Result: `39 passed`.

Previously failing deterministic product bugs are now fixed:

- Public self-service `ADMIN` registration now returns non-201.
- Rapid double-click on project create now creates one project.
- `PROAB` direct material-request approval now returns `403`.
- Query DTO `page`/`limit` parsing now works for frontend list reloads.
- Concurrent alert resolve/update/delete now returns controlled non-5xx responses.
- `tenantSlug` and optional auth fields are preserved by validation, so cross-tenant tests create/use a real second tenant.
- Cross-tenant IDOR matrix now covers every major entity graph by direct ID/URL.
- Warehouse transaction confirm/reject races now finalize once and apply inventory balance once.
- Report downloads now require authenticated ownership, registered file path, and financial-report role authorization.
- Disabled users now lose stale JWT access because auth guard revalidates active user state.
- DTO numeric minimum/maximum boundaries and pagination limits now reject invalid values with controlled 4xx responses.
- Audit-log direct API is admin-only and sensitive mutation audit records are asserted.
- Mobile viewport smoke and dashboard API failure behavior are covered.
- Local mixed read/write load-soak, Prisma schema validation, and application-level backup/restore smoke are covered.

| Area | Normal workflow | Invalid/empty | Boundaries | Duplicate/rapid | Refresh/back | Unauthorized/direct URL | Roles | Stale/conflict/API failure | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth login | Admin login to dashboard | Empty submit, wrong password | Required username/password | Submit disabled while pending observed in code | Direct protected URL redirect plus auth back/forward | Anonymous `/app/users` redirects `/login` | Admin, PROAB API login | Forced `/auth/login` 500 shows error | UI stays on login after failure |
| Registration | Public register form tested | Required/min password inspected | Password min 6 | Not covered yet | Auth route history tested | Public ADMIN self-register blocked | ADMIN self-registration probe | Backend rejection covered | Backend rejects privileged self-registration |
| Projects | Admin create/select project | Empty name disables create | Date fields inspected | Rapid double-click encoded and passing | Refresh keeps project visible | PROAB API create forbidden; UI button hidden | Admin/PROAB | Double-submit guarded in UI | Current project stored in localStorage |
| Users | Admin route renders | Empty create guarded client-side | Password placeholder min inspected | Not covered yet | Direct URL tested | PROAB `/app/users` access denied and `/users` API 403 | Admin/PROAB | Not covered yet | UI and backend align for users list |
| Reports | Generate report, history tab | Path traversal download rejected | Report type/period options | Concurrent generation covered at workflow level | Route refresh covered | PROAB non-financial export allowed, financial export/download forbidden | Admin/PROAB/foreign tenant | Raw `filePath` download protected | UI/backend align: PROAB no financial report |
| Material requests | PROAB create, admin approve | Empty submit keeps dialog open | Quantity zero/negative API boundary checked | Concurrent create/approve load covered | Refresh keeps request visible | PROAB direct approve returns `403` | Admin/PROAB | Concurrent approvals plus audit covered | UI/backend both restrict approval to admin |
| Warehouse | Route/tabs render | Required fields guarded client-side | Quantity number input inspected | 20-way double-confirm race covered | Route refresh covered | Cross-tenant warehouse item/transaction blocked | Admin/PROAB route render covered | Confirm/reject race covered | Balance changes exactly once |
| Brigades/machines | Brigade, work log, machine, machine log created | Required names/ids guarded client-side | Worker/hour/progress boundaries covered | Not covered yet | Route refresh covered | Auth guard applies API-wide | Admin route workflow covered | Create failure UI not covered | Work and machine logs visible after create |
| Estimates | JSON import invalid and valid, line search | Invalid JSON covered | Quantity/price covered | Not covered yet | Route refresh covered | Auth guard applies API-wide | Admin prices visible, PROAB prices hidden | Excel network import not covered | Estimate lines list reloads correctly |
| Zones | Create zone, update progress to 100 | Required name guarded client-side | Progress 0-100 boundaries covered | Not covered yet | Route refresh covered | Auth guard applies API-wide | Admin workflow covered | Stale slider conflicts not covered | Status becomes `COMPLETED` at 100 |
| Alerts | Create via API, filter, ack, resolve | Empty filter state covered | Severity/status filters covered | Not covered yet | Route refresh covered | Auth guard applies API-wide | Admin workflow covered | Concurrent resolve/update/delete covered | Alert status changes visible |
| Settings/dashboard | Settings language persists, dashboard route renders | Failed dashboard API covered | Language values covered | Load-soak mixed reads covered | Refresh/back covered | Stale project clears to no selection | Admin/PROAB dashboard visibility | Stale deleted project and aborted API covered | Logout clears session |
| Stress | Auth storm, parallel browser sessions, bulk import, concurrent requests | Invalid boundary payloads covered | 300 estimate lines, 80 material requests | Concurrent approval/delete/update/confirm/reject covered | Parallel sessions covered | Admin/PROAB/foreign tenant mixed | Admin/PROAB | Alert and inventory races covered | No 5xx under tested stress |
| Tenant isolation | Second tenant login/register covered | Cross-tenant direct IDs blocked | Full entity graph IDOR covered | Relationship injection blocked | Direct URL/API covered | User A cannot read/mutate/delete User B tenant data | Admin/PROAB plus foreign PROAB | Cross-tenant approve and download blocked | Tenant boundary enforced |
| Auth edge cases | Login/logout covered | Expired JWT and disabled-user JWT rejected | Expired `exp` and inactive status covered | Auth storm covered | Logged-out direct routes covered | `/auth/me` expired/inactive returns `401` | Admin/PROAB | Forced API failure covered | Frontend stale token returns login |
| RBAC negatives | PROAB denied admin APIs | Admin-only actions blocked | Financial report forbidden | Not covered yet | Direct API covered | `/users`, `/projects`, approvals, financial export | PROAB negative proof | Not covered yet | Admin-only contracts enforced |
| Audit log | Admin can query mutation audit | PROAB direct create/read denied | Single approval audit asserted | Duplicate audit for approval blocked by exact count | Not applicable | Audit API admin-only | Admin/PROAB | Sensitive mutation audit presence covered | Audit tenant/role boundary enforced |
| Referential integrity | Project delete cascade covered | Stale child reads return 404 | Optional warehouse relation nulling covered | Not applicable | Not applicable | Auth guard applies | Admin | Cascade cleanup and stale children covered | No 5xx on tested deletes |
| Operational smoke | Prisma schema validate | App-level restore payload checked | Local API load-soak | Mixed read/write waves | Not applicable | Authenticated APIs | Admin | Build/test from clean command covered | Not full infra DR |
| Responsive/mobile | Mobile dashboard route covered | Aborted API covered | 390px viewport no horizontal overflow | Not applicable | Not applicable | No protected secrets in UI text | Admin | Blank UI avoided under failed API | Chromium mobile emulation |

## Fixed Findings

1. Public registration exposed `role=ADMIN`; backend now rejects `ADMIN` self-registration.
2. Material request approval was hidden from PROAB in UI but allowed by direct API; backend now requires `ADMIN`.
3. Rapid double-click on project create created duplicates; create button now disables while request is in flight.
4. Several query DTOs rejected frontend `page`/`limit` string values and list reloads silently stayed empty; DTOs now transform query numbers.
5. Concurrent alert resolve/update/delete could surface Prisma `P2025` as 5xx; alert mutations now map stale races to `404`.
6. `tenantSlug` was stripped by `ValidationPipe` because it had no validators; auth DTO now validates optional tenant fields so real tenant isolation can be tested.
7. Warehouse transactions could be confirmed/rejected after terminal state and double-apply balance; terminal transition is now atomic and returns `409` for stale attempts.
8. Report download accepted raw file paths without checking ownership/role; downloads now require an existing report record visible to the user and block PROAB financial downloads.
9. Active JWTs remained valid after user disable/delete; auth guard now revalidates active user state and current role on every protected request.
10. Estimate lookup returned `null` for inaccessible IDs and update/delete continued with raw ID; inaccessible estimates now return `404` before mutation.
11. Audit-log direct API allowed non-admin access; controller is now admin-only.
12. Numeric DTOs accepted invalid negative/over-limit values; DTO min/max validators now reject tested invalid boundaries.

## Remaining Finding

Warehouse item transaction history confirmation sends `{ confirmedQuantity: 0 }`, which can confirm a pending transaction to zero from one UI path. Needs targeted data setup before permanent test.
