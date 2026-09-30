# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3030 (not 3000; the user runs other apps on 3000/4000)
- `npm run build` — production build
- `npm run start` — serve the production build on port 3030
- `npm run lint` — `next lint`
- `npm test` — `vitest run` (one-shot)
- `npm run test:watch` — vitest in watch mode

The vitest config lives at `vitest.config.mts` (the `.mts` extension is required — `vitest@^4` is ESM-only and `.ts` won't load).

### Database commands

- `docker compose up -d` — start local PostgreSQL 16 (or use the locally-installed PostgreSQL 13)
- `npx prisma db push` — push schema to DB (no migration files; dev-mode only)
- `npx prisma generate` — regenerate the Prisma client after schema changes
- `npx prisma studio` — browser-based DB viewer at http://localhost:5555

## Project intent

SPC (Statistical Process Control) / quality-improvement web app aimed at non-statisticians in healthcare and operational improvement, following NHS "Making Data Count" guidance. The product has two distinct areas:

1. **SPC chart builder** (`/` and `/chart`) — the original free-chart tool. Ephemeral, no auth required.
2. **NHS BI Dashboard** (`/dashboard`) — a multi-chart dashboard builder. Auth-gated, cloud-persisted per user. Covers every chart type in `EXPANSION_SPEC.md`.

## Architecture

Next.js 14 App Router. The dashboard is backed by **PostgreSQL via Prisma** with **NextAuth v5** authentication. The SPC free chart remains ephemeral (no backend).

### Routes

```
/                       Public, ephemeral single-measure SPC view (the "free chart").
                        State lives only in component useState; nothing is saved.
/chart                  Alternate entry for the free SPC chart.
/auth/signin            Sign-in page — Microsoft (NHS primary), Google, email magic link.
/auth/error             Auth error landing page.
/dashboard              Dashboard list (server component, auth-gated). Shows all dashboards
                        for the signed-in user; create / delete from here.
/dashboard/[id]         Specific dashboard workspace (server component, auth-gated).
                        Loads DashboardState from Postgres, renders DashboardWorkspace.
                        Autosaves on 400 ms debounce via useDashboardAutosave hook.
/dashboard/view         Public read-only shared view. Accepts compressed DashboardState
                        in the ?d= query param (client-side decompression, no auth).
```

### Authentication — NextAuth v5

Config lives in **`auth.ts`** at the project root. Exports `{ handlers, auth, signIn, signOut }`.

- **Providers**: Resend (email magic link), Microsoft Entra ID, Google
- **Adapter**: `@auth/prisma-adapter` — sessions stored in PostgreSQL
- **Session strategy**: database (not JWT); session includes `user.id` via the `session` callback
- **Middleware** (`middleware.ts`) — protects `/dashboard/*` and `/api/dashboards/*`. The `/dashboard/view` path is explicitly bypassed (public shared links). Unauthenticated requests redirect to `/auth/signin`.
- **Type augmentation** — `next-auth.d.ts` adds `id: string` to `Session['user']`

Environment variables (see `.env.local.example`):
```
DATABASE_URL            PostgreSQL connection string
AUTH_SECRET             Random secret for session signing — generate with: npx auth secret
AUTH_RESEND_KEY         Resend API key (email magic links)
AUTH_RESEND_FROM        Sender address, e.g. noreply@auxtechna.com
AUTH_MICROSOFT_ENTRA_ID_ID       Azure app client ID
AUTH_MICROSOFT_ENTRA_ID_SECRET   Azure app client secret
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID  "organizations" for all work accounts, or a specific tenant GUID
AUTH_GOOGLE_ID          Google OAuth client ID
AUTH_GOOGLE_SECRET      Google OAuth client secret
```

Providers with empty/missing env vars are silently skipped by NextAuth at runtime — you can configure them incrementally.

### Database — Prisma + PostgreSQL

Schema at **`prisma/schema.prisma`**. Models:

| Model | Purpose |
|---|---|
| `User` | NextAuth user record |
| `Account` | OAuth provider link per user |
| `Session` | DB-backed session (NextAuth) |
| `VerificationToken` | Magic-link tokens |
| `Dashboard` | One row per dashboard; `state Json` holds the full serialised `DashboardState` |

The `Dashboard.state` column stores the entire `DashboardState` object as PostgreSQL JSON. This includes datasets (rows), charts, tiles, theme, annotations, stories, and slide decks. Cast it with `as unknown as DashboardState` when reading back.

Prisma client singleton: **`lib/prisma.ts`** — standard global-for-hot-reload pattern.

**Dev workflow**: use `prisma db push` (no migration files) during active development. Switch to `prisma migrate dev` before the first production deployment.

### Dashboard persistence

`DashboardWorkspace` receives `dashboardId: string` and `initialState: DashboardState` as props (passed from the server component at `/dashboard/[id]/page.tsx` which fetches from Postgres directly).

**`lib/dashboard/useDashboardAutosave.ts`** — debounce hook:
- Initialises from `initialState`, skips the first-mount save
- On any subsequent `setState` call, debounces 400 ms then PUTs to `/api/dashboards/[id]`
- Returns `{ state, setState, saveStatus }` where `saveStatus` is `'saved' | 'saving'`
- `setState` has the same `Dispatch<SetStateAction<DashboardState>>` signature as React's `useState` setter — all existing call sites in DashboardWorkspace work unchanged

### Dashboard API routes

All routes live under `app/api/dashboards/`. All are auth-gated via `await auth()`.

| Route | Method | Purpose |
|---|---|---|
| `/api/dashboards` | GET | List all dashboards for the current user |
| `/api/dashboards` | POST | Create a new empty dashboard, return `{ id }` |
| `/api/dashboards/[id]` | GET | Fetch one dashboard (ownership checked) |
| `/api/dashboards/[id]` | PUT | Autosave — update `state` and `title` |
| `/api/dashboards/[id]` | DELETE | Delete (ownership checked) |

### Dashboard component tree

```
app/dashboard/page.tsx              Server component — fetches dashboard list, renders DashboardList
app/dashboard/[id]/page.tsx         Server component — fetches DashboardState from DB, renders DashboardWorkspace
  DashboardWorkspace                Client component — owns all UI state
    useDashboardAutosave            Debounced PUT to /api/dashboards/[id]
    DatasetManager
    TileGrid
      TileRenderer (per tile)
        DashHeatmapChart | DashScorecardChart | DashLineChart | ... (all chart variants)
    <editor modals>                 Full-screen editors: HeatmapTileEditor, ScorecardTileEditor, etc.
    <panels>                        ThemePanel, RagRulesPanel, MetricLibraryPanel, etc.
    PresentationMode / SlidedeckMode
app/dashboard/DashboardList.tsx     Client component — card grid, create / delete
app/dashboard/view/page.tsx         Public read-only view (URL-encoded compressed state)
```

### Dashboard tile types (`lib/dashboard/types.ts`)

`TileKind`: `spc | kpi | text | bar | line | table | image | run | pareto | heatmap | calendar | pie | area | scatter | funnel | gantt | waterfall | pyramid | boxplot | title | section | scorecard`

Each kind has a corresponding `*TileConfig` interface and a `*TileEditor` component. `TileRenderer` dispatches on `chart.type` to render the correct chart component.

### DashboardState shape

```ts
{
  version: '2.0';
  exportedAt: string;
  datasets: Dataset[];          // uploaded CSVs with rows, columns, transformLog
  charts: ChartConfig[];        // chart definitions (type + config + drillThrough)
  dashboard: {
    title: string;
    tiles: DashboardTile[];     // { id, chartId, x, y, w, h }
    theme: DashboardTheme;
  };
  ragRules: RagRule[];
  metrics: MetricDef[];
  annotations: AnnotationDef[];
  stories: Story[];             // Presentation Mode 1 stories
  slideDecks: SlideDeck[];      // Presentation Mode 2 slide decks
}
```

JSON import/export (`lib/dashboard/io.ts`) round-trips this shape. Snapshots are the same shape with additional `snapshotName/Notes/TakenAt` fields. The `version: '2.0'` guard rejects legacy SPC-only files.

---

### Where the SPC maths lives

All SPC statistics live in a pure functional library under `lib/spc/`. The chart component consumes precomputed analyses; it does not segment, derive limits, or detect rules.

- **`lib/spc/index.ts`** — entry point. `analyseSpc(rows, { kind })` dispatches on chart kind and returns `{ analysis, plottedRows }`.
- **`lib/spc/xmr.ts`** — mean, median, moving ranges, XmR limits via mR̄ / 1.128 (MDC recipe).
- **`lib/spc/segments.ts`** — segments the row series at every `recalculate === true` boundary, computes per-segment mean/median/UCL/LCL.
- **`lib/spc/rules.ts`** — four MDC variation rules. Run chart: rule 1 skipped, rules 2/3/4 use median + sign-aware logic.
- **`lib/spc/pchart.ts`**, **`lib/spc/count.ts`** — P/C/U attribute charts.
- **`lib/spc/pareto.ts`**, **`lib/spc/funnel.ts`** — Pareto and Funnel chart kinds.
- **`lib/spc/correlation.ts`** — Pearson + lagged cross-correlation. Convention: lag = +k means x leads y.
- **`lib/spc/icons.ts`** — MDC variation + assurance icons from analysis + aim + target.

`SpcAnalysis` (in `lib/spc/types.ts`) is the contract between the maths layer and the chart.

### The chart component (`app/spc/spc.jsx`)

Still imperative D3 inside a `useEffect`. It receives `params.data` (MeasureRow[]), `params.chartKind`, `params.aim`, `params.target`, and `params.events` (driver-linked incident markers). Uses `useRef` + `d3.select(...).selectAll('*').remove()` on each render — do not switch to JSX-driven D3 without removing that imperative clear first.

### Row shape (SPC)

```js
{ date: "YYYY-MM-DD",
  value: "<numeric string>",
  denominator?: "<numeric string>",   // required for P/U
  comment: { title, label, recalculate: bool, justification?, confirmedAt? }
}
```

---

## Conventions

- **Mixed `.tsx` and `.jsx`** — `allowJs: true`, `strict: false` (see `tsconfig.json`). Newer components are TS; `spc.jsx`, `AppearanceForm.jsx`, `MeasureEditor.jsx` and the chart helpers stayed JS. Use TS for new files.
- **Path alias** `@/*` maps to the project root.
- **Tailwind utility classes** only.
- **Server components** for data-fetching pages (`/dashboard/page.tsx`, `/dashboard/[id]/page.tsx`) — call `auth()` and Prisma directly, no fetch overhead.
- **Client components** for all interactive UI — `'use client'` at the top.
- **Server actions** for auth flows — `signIn(provider, { redirectTo })` called inside inline `async function` tagged `'use server'` within JSX forms.
- **Pure operations layer** — every Project mutation goes through `lib/project/operations.ts`. Operations return new state; never mutate. Dashboard mutations happen inline via `setState` in DashboardWorkspace (no separate operations layer for the dashboard).
- **Tests live alongside source** — `foo.ts` next to `foo.test.ts`. ~200 tests cover SPC maths and project operations. UI and dashboard are not unit-tested.
- **`app/components/header.tsx`** is still empty/unused. Don't add to it.

## Environment

### Required for dashboard

```
DATABASE_URL     PostgreSQL — local Docker or Azure PostgreSQL Flexible Server (UK South for prod)
AUTH_SECRET      Random 32+ char string — run `npx auth secret` to generate
```

### Optional (auth providers — app still boots without these)

```
AUTH_RESEND_KEY / AUTH_RESEND_FROM    Email magic links via Resend
AUTH_MICROSOFT_ENTRA_ID_*             Microsoft / NHS work accounts
AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET   Google OAuth
```

### Local setup

```bash
docker compose up -d          # start PostgreSQL 16 (or use local PG 13)
npx prisma db push            # create tables
npm run dev                   # start dev server on :3030
```

Copy `.env.local.example` → `.env.local` and fill in `DATABASE_URL` and `AUTH_SECRET` at minimum. The app boots without OAuth providers configured; sign-in will just show no buttons for unconfigured providers.
