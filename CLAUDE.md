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

## Project intent

SPC (Statistical Process Control) / quality-improvement web app aimed at non-statisticians in healthcare and operational improvement, following NHS "Making Data Count" guidance. The vision is captured in `spc_app_build_plan-1.md` and `spc_app_build_plan-2.md`. Most of the v2 plan is now implemented (XmR, Run, P/C/U, Pareto, Funnel charts; sub-process splits; aim statements; drivers; PDSA cycles; cause-and-effect; process maps; incident analysis; lagged correlation; narrative theme clustering; driver-linked auto-annotation). Geographic clustering and Phase 6 (collaboration / exports / templates) are still open.

## Architecture

Next.js 14 App Router with **localStorage persistence** under a single local keyspace. No auth, no backend — every project lives in the user's browser.

### Routes

```
/                       Public, ephemeral single-measure SPC view (the "free chart").
                        State lives only in component useState; nothing is saved.
                        Amber banner across the top hints that work isn't persisted —
                        head to /projects to keep results.
/projects               Lists projects from localStorage with create / open / rename /
                        delete. Server stub renders ProjectsList (client).
/projects/[id]          Loads the project by id, autosaves edits on a 400 ms debounce,
                        renders ProjectWorkspace. ProjectShell handles hydration,
                        missing-project state, and the save-status indicator.
```

### State and persistence

- **`lib/project/store.ts`** — pure localStorage layer. Storage keys are `spc:index:local` (a `ProjectSummary[]` for the list view) and `spc:project:local:<id>` (the full Project). `listProjects`, `getProject`, `saveProject`, `deleteProject`, `createProject`, `renameProject`. All functions are no-ops when called server-side (`typeof window === 'undefined'`). The `local` scope is hard-coded — the previous Clerk-userId scoping has been removed.
- **`lib/project/useProjectAutosave.ts`** — debounced autosave hook used by `ProjectShell`. Hydrates from localStorage, exposes `setProject` like `useState`, writes back after 400 ms of inactivity. A `pending` ref + cleanup effect flushes the last edit synchronously on unmount so navigation never drops the final change. Status is `loading` → `saved` → `saving` → `saved`.
- **No backend**. Moving to one is a swap of `lib/project/store.ts`; the import surface (`listProjects` / `getProject` / `saveProject` / etc.) is the seam.

### Workspace component tree

`ProjectWorkspace` is the root of the in-project UI. It owns the Project state passed in by `ProjectShell` and the active-measure id. All mutations flow as: child component → callback → operation function in `lib/project/operations.ts` (pure, returns a new Project) → `setProject(next)`. Children are dumb; they only render and emit callbacks.

```
ProjectShell                       app/projects/[id]/ProjectShell.tsx
  useProjectAutosave (hydrate + autosave + status)
  ProjectWorkspace                 app/spc/ProjectWorkspace.tsx
    Top nav (← SPC, project name, save-status pill)
    AimEditor
    View tabs: Measures / Drivers / PDSA / Cause-effect / Process map / Incidents / Correlation
    <active view>
      MeasureView (measure tabs + chart + controls + editor)
        MeasureChartCard → LineChart (spc.jsx) | ParetoChart | FunnelChart
        MeasureEditor (tabular data editor + AppearanceForm)
      DriverDiagramView
      PDSALog
      IshikawaView
      ProcessMapView
      IncidentsView
      CorrelationView
```

`ProjectWorkspace` accepts two optional shell props: `navRight` (rendered in the top nav, used for the save indicator) and `showBackToProjects` (makes the "SPC" brand link to `/projects`). The free chart at `/` does NOT use ProjectWorkspace — it embeds `MeasureView` directly with a single-measure ephemeral project.

### Where the SPC maths lives

All SPC statistics moved out of `spc.jsx` into a pure functional library under `lib/spc/`. The chart component now consumes precomputed analyses; it does not segment, derive limits, or detect rules.

- **`lib/spc/index.ts`** — entry point. `analyseSpc(rows, { kind })` dispatches on chart kind and returns `{ analysis, plottedRows }`. `plottedRows` is what the chart plots on the y-axis: same as input for XmR/RunChart, proportion = numerator/denominator for P, etc.
- **`lib/spc/xmr.ts`** — mean, median, moving ranges, **XmR limits via mR̄ / 1.128** (the MDC recipe, replacing the previous stdev-based limits).
- **`lib/spc/segments.ts`** — segments the row series at every `recalculate === true` boundary, computes per-segment mean/median/UCL/LCL, then projects them onto each row as `pointLimits`.
- **`lib/spc/rules.ts`** — four MDC variation rules: (1) single point outside limits, (2) 7+ on the same side of the mean, (3) 7+ in a row trending in one direction, (4) 2 of 3 consecutive in the outer third. For run charts (no limits), rule 1 is skipped and rules 2/3/4 use the median + sign-aware logic.
- **`lib/spc/pchart.ts`**, **`lib/spc/count.ts`** — P/C/U attribute charts (Poisson / binomial limits).
- **`lib/spc/pareto.ts`**, **`lib/spc/funnel.ts`** — categorical "chart kinds" (Pareto descending bars + cumulative %; Funnel cross-unit comparison with Poisson limits).
- **`lib/spc/correlation.ts`** — Pearson + lagged cross-correlation for the Correlation view. Convention: `ccf(x,y)_k = corr(x_t, y_{t+k})`, so lag = +k means x leads y.
- **`lib/spc/icons.ts`** — derives the MDC variation + assurance icons from analysis + aim + target.

`SpcAnalysis` (in `lib/spc/types.ts`) is the contract between the maths layer and the chart: `{ kind, segments, pointLimits, rules }`.

### The chart component (`app/spc/spc.jsx`)

Still imperative D3 inside a `useEffect`, but now stateless w.r.t. maths. It receives:

- `params.data` — `MeasureRow[]` (the editor's row shape; see below)
- `params.chartKind`, `params.aim`, `params.target`, plus everything from `measure.settings`
- `params.events` — optional `Array<{ date, label }>` of driver-linked incident markers (rendered as thin red dashed verticals with a label box at the top)

It still uses `useRef` + `d3.select(...).selectAll('*').remove()` to wipe the SVG on each render — do not switch to a JSX-driven D3 approach without first removing that imperative clear.

The old `calculateOutliers` quirks (prop mutation, the chartData state loop) are gone. The chart no longer schedules state updates inside the same effect that reads them.

### Row shape

The MeasureEditor row shape (used everywhere data crosses the form/chart boundary):

```js
{ date: "YYYY-MM-DD",
  value: "<numeric string>",
  denominator?: "<numeric string>",   // required for P/U
  comment: { title, label, recalculate: bool, justification?, confirmedAt? }
}
```

`value` and `denominator` stay strings because the editor uses contentEditable cells; they are coerced via `Number(...)` at calculation sites. `comment.recalculate` drives phase segmentation — set it on the first row of a new phase. Pareto/Funnel overload `date` as the category/unit label (the chart kind is in `measure.chartKind`).

### Driver-linked auto-annotation

When a change-idea leaf in the driver diagram has both `measureId` and `linkedIncidentType` set, `collectIncidentEventsForMeasure(project, measureId)` (in `lib/project/incidents.ts`) walks the diagram, collects incidents of that type from `project.incidentDataset`, aggregates them by date, and returns `{ date, label }[]`. `MeasureView` computes this with `useMemo`, threads it through `MeasureChartCard`, and the chart paints a marker per event. This stitches the driver diagram (hypothesis layer) to the measure chart (test layer).

## Conventions

- **Mixed `.tsx` and `.jsx`** — `allowJs: true`, `strict: false` (see `tsconfig.json`). Newer SPC components are TS; older ones (`spc.jsx`, `AppearanceForm.jsx`, `MeasureEditor.jsx`, the chart helpers) stayed JS and rely on loose typing. Use TS for new files.
- **Path alias** `@/*` maps to the project root.
- **Tailwind utility classes** only.
- **Pure operations layer** — every Project mutation goes through `lib/project/operations.ts` (and friends like `lib/project/incidents.ts`). Operations return new Projects; never mutate. UI components do not transform Project state inline.
- **Tests live alongside source** — `foo.ts` next to `foo.test.ts`. There are ~200 tests covering the maths libraries and the operations layer; UI is not unit-tested.
- **No real persistence backend** — anything that needs to survive across devices needs to wait until `lib/project/store.ts` is swapped for a backend. The hook surface is intentionally narrow.
- **`app/components/header.tsx`** is still empty/unused. Don't add to it without a reason.

## Environment

- No environment variables required. The app boots straight to the free chart on `/` and the workspace on `/projects` without any setup. Auth (Clerk) was removed; if it comes back later the seams to restore are `app/layout.tsx` (provider), `middleware.ts` (deleted — would gate `/projects`), and the userId arg on `lib/project/store.ts` (currently hard-coded to `'local'`).
