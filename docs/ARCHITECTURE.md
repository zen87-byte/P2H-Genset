# GENSET CARE source structure

The UI is split into page-level components under `src/components/pages/`:

- `DashboardPage.tsx` – dashboard KPIs, site progress, master unit table, and operational status log.
- `InspectionPage.tsx` – daily P2H inspection form and checklist.
- `FindingsPage.tsx` – findings register and manual finding creation.
- `UserManagementPage.tsx` – account creation and site assignment management.
- `HistoryPage.tsx` – inspection/finding history, filters, approval actions, and inspection detail entry point.
- `src/components/ui.tsx` – reusable `Field`, `Kpi`, `Empty`, and status label helpers.

`src/app/page.tsx` remains the application controller for session, API calls, state, navigation shell, and shared modals. The page-specific markup is no longer embedded in that file. API routes, Prisma schema, seed/bootstrap scripts, and `.env` conventions are retained from the source archive.
