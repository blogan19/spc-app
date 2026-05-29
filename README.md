# SPC

A Statistical Process Control / quality-improvement web app aimed at non-statisticians in healthcare and operational improvement, following the NHS [Making Data Count](https://www.england.nhs.uk/publication/making-data-count/) guidance.

Plot a measure over time, get sensible control limits, see which points are signal vs noise, mark when a process change happened, link improvement ideas to measures, and log PDSA cycles — all in the browser, with no account and no backend.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3030
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on **port 3030** |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on 3030 |
| `npm run lint` | `next lint` |
| `npm test` | `vitest run` (one-shot) |
| `npm run test:watch` | Vitest in watch mode |

> Port 3030, not 3000 — the author runs other things on 3000/4000.

## What's in it

- **Chart kinds** — XmR, Run, P, C, U, Pareto, Funnel
- **MDC variation rules** — point outside limits, 7 on one side of mean, 7 in a trend, 2-of-3 in the outer third
- **Sub-process splits** — mark a row as a phase boundary and limits recalculate from that point on
- **Aim statements & targets** — drive the assurance icon
- **Driver diagrams** — primary drivers → secondary drivers → change ideas
- **PDSA log** — plan/do/study/act cycles linked to change ideas
- **Cause-and-effect (Ishikawa)** and **process maps**
- **Incident analysis** with narrative theme clustering
- **Lagged correlation** between any two measures (Pearson + cross-correlation)
- **Driver-linked auto-annotation** — incidents of a given type appear as markers on the linked measure's chart

## Architecture (short version)

Next.js 14 App Router. **localStorage only** — every project lives in the user's browser; there is no auth and no backend. The storage layer is a single file (`lib/project/store.ts`) — swapping it for a real backend is the intended path to multi-device sync.

```
/                       Public, ephemeral single-measure SPC view (the "free chart")
/projects               Project list (create / open / rename / delete)
/projects/[id]          The workspace — autosaves on a 400 ms debounce
```

All SPC maths is pure and lives under `lib/spc/` with ~200 vitest tests. The chart component (`app/spc/spc.jsx`) consumes precomputed analyses and is stateless w.r.t. statistics.

See [`CLAUDE.md`](./CLAUDE.md) for a longer architectural tour and [`spc_app_build_plan-1.md`](./spc_app_build_plan-1.md) / [`spc_app_build_plan-2.md`](./spc_app_build_plan-2.md) for the original vision.

## Status

Most of the v2 plan is implemented. Still open: geographic clustering, and Phase 6 (collaboration / exports).

## License

[MIT](./LICENSE) © Ben Logan
