# SPC Chart App — Build Plan v2

## 1. What changed in v2

v1 framed the app as a chart-making tool with collaboration bolted on. v2 reframes it as a **Quality Improvement (QI) project workspace** in which SPC charts are one of several first-class artefacts, sitting alongside aim statements, driver diagrams, PDSA logs and incident data. This is the model used by the NHS *Making Data Count* programme, the BGS QI Hub and the NHS Institute *Quality Improvement: Theory and Practice in Healthcare* paper.

Sources that drive this plan:
- *Making Data Count — Getting Started* (NHS Improvement, 2019)
- *Making Data Count — Strengthening Your Decisions* (NHS England / Improvement)
- BGS QI Hub Methodology (https://www.bgs.org.uk/qi-hub-methodology)
- *Quality Improvement: Theory and Practice in Healthcare* (NHS Institute, 2008)
- **NHSRplotthedots** — the NHS-R Community R package, the de facto reference implementation of MDC-compliant XmR charts (https://nhs-r-community.github.io/NHSRplotthedots/)
- **Patient Safety Incident Response Framework (PSIRF)** and **Learn From Patient Safety Events (LFPSE)** — the post-2024 NHS patient safety landscape (NRLS decommissioned 30 June 2024; PSIRF replaced the Serious Incident Framework)
- IHI *Quality Improvement Essentials Toolkit* and IHI *Health Equity Measurement Framework* (https://www.ihi.org/)

## 2. Audience and principles

Audience: clinicians, ward managers, board members, improvement analysts — the same "ward to board" range MDC targets. **Statistical literacy is not assumed.** Analysts are a power-user persona, not the default.

Principles (refined from v1):

- **Clarity over cleverness.** Decisions, not dashboards.
- **Plot the dots.** A time series with rules is always better than two-point comparison or RAG.
- **Show variation, don't mask it.** No rolling averages by default; rolling averages are a deprecated visualisation per MDC.
- **Three measure types.** Every chart belongs to a project and is tagged outcome / process / balancing.
- **Annotate everything.** Context is what turns a chart into a decision.
- **Measured, not Shifty.** Recalculating control limits is a guarded, auditable workflow.
- **Accessible, presentation-ready.** Exports must render without the app.

## 3. Domain model

A project — not a chart — is the unit of work:

```
Project
├── Aim statement              (SMART, time-bound, population-defined)
├── Driver diagram             (aim → primary → secondary drivers → change ideas)
├── Measures (N)               each one a chart:
│   ├── type: outcome | process | balancing
│   ├── chart kind: XmR | P | C | U | RunChart | Funnel
│   ├── data series
│   ├── phase boundaries       (recalculate events, with justification)
│   └── annotations            (links to PDSA cycles, incidents, narrative)
├── PDSA cycles                (plan / do / study / act, with predictions vs results)
├── Incident dataset (optional)  (imported from a source system, read-only — see §7)
└── Reports                    (auto-generated icon summary, exportable to PDF / PPTX)
```

This is the structure BGS QI Hub describes as standard QI artefacts: aim statement, measures, PDSA worksheets, driver diagram, project initiation document.

## 4. P0 — Statistical correctness

The current prototype implements SPC informally. MDC: *Strengthening Your Decisions* is explicit that some of these shortcuts produce wrong answers. These must be fixed before any new features ship.

| # | Problem | Fix |
|---|---|---|
| P0.1 | Limits computed as `mean ± 3 × stdev` | Use **3-sigma** from XmR construction: `centre = mean(x)`, `sigma = mean(|x_i − x_{i-1}|) / 1.128`, `UCL/LCL = centre ± 3·sigma`. MDC: "Setting incorrect limits will mislead decision-making." |
| P0.2 | Run rule uses **median** while limits use **mean** | XmR uses **mean** for both. Median is only correct for run charts (n<12 or non-XmR). One centre line per chart, clearly labelled. |
| P0.3 | Direction-run rule threshold of 7 | Use **6 consecutive** increasing/decreasing per MDC. |
| P0.4 | Two-out-of-three-in-outer-third rule **missing** | Implement. Critical for volatile data with wide limits. |
| P0.5 | `recalculate` is an ungated checkbox | Replace with the "Measured" guarded flow — see §6.2. |
| P0.6 | Mutates `params.data` during render | Pure calculation; chart receives derived row objects, never writes back. |
| P0.7 | Outlier state read in same effect that schedules it | Move calculation out of `useEffect`; compute synchronously from data and render. No flash of stale state on first paint. |

A small `lib/spc/` module should hold the maths, with property tests covering: known XmR worked examples, the four rule definitions, recalculation segmentation.

**Reference implementation.** Use the NHS-R community's `NHSRplotthedots` R package as the cross-check oracle. It implements `ptd_spc()` with `value_field`, `date_field`, `improvement_direction` and `facet_field` — match the parameter naming and rule semantics so that exporting a series from the app and plotting it via `NHSRplotthedots` produces identical icons, limits and rule triggers. This makes the app's correctness independently auditable by any NHS analyst.

## 5. Core tool set

The MDC programme publishes a set of recommended tools. The app should provide native equivalents rather than expecting users to bounce between the SPC chart and an external Excel sheet.

### 5.1 Chart types

| Kind | When to use | Notes |
|---|---|---|
| **XmR** | Default — "Swiss army knife" for any continuous metric over time | Implement first |
| **P chart** | Proportions where denominator varies (e.g. % falls per 1,000 bed days) | Better sensitivity than XmR for proportions |
| **C chart** | Counts of rare events with constant exposure (e.g. incidents per ward-week) | Particularly relevant to the incident module |
| **U chart** | Rates of rare events with varying exposure | Pairs with the funnel plot for benchmarking |
| **Run chart** | <12 data points, or when sigma is unstable | Median centre line, simple run rules only |
| **Funnel plot** | Cross-unit benchmarking at one point in time | 2σ and 3σ funnels, exposure-adjusted |

### 5.2 Non-chart artefacts

- **Aim statement builder** — structured form (population, target metric, magnitude, deadline). BGS naming convention.
- **Driver diagram** — node editor (aim → primary drivers → secondary drivers → change ideas). Each leaf can link to a measure.
- **PDSA log** — one entry per cycle, captures prediction up front (locks once "Do" starts) and result after. Surfaces prediction-vs-result delta — this is the heart of the Model for Improvement and the part most teams skip.
- **Cause-and-effect (Ishikawa) diagram** — six-bone template, freeform. Mentioned in the NHS QI doc as one of Ishikawa's seven QC tools.
- **Process map** — swim-lane editor, linkable to incidents and measures.
- **Pareto chart** — by category, cumulative %, with Pareto-front highlighting. Mentioned in both MDC and the NHS QI Theory paper as essential for "where to focus".

### 5.3 Reporting view — the icon summary

The MDC: Strengthening contribution that most differentiates SPC reporting from RAG. Two icon families per measure:

- **Variation icon** — *concerning special cause* / *improvement special cause* / *common cause only*. Derived automatically from the four rules.
- **Assurance icon** — *consistently meets target* / *consistently misses target* / *hit-or-miss* (target inside limits). Derived from target line position relative to UCL/LCL.

A board-level "summary grid" view shows one row per measure, columns: name | variation icon | assurance icon | sparkline | last commentary. Click-through opens the full chart. This **replaces** the RAG table at the top of integrated performance reports.

## 6. Workflow features

### 6.1 Annotations and phase boundaries

- Annotations are first-class: every annotation has a date, label, optional link to a PDSA cycle or incident.
- A "phase boundary" is a special annotation that marks where limits should be recalculated.

### 6.2 Measured-recalculation flow

Replace the bare `recalculate` checkbox with a three-step guarded flow taken from MDC: *Strengthening* p.18:

1. Has the chart shown statistically significant change? (auto-check against the four rules)
2. Can the user identify a *real process change* that caused it? (free-text + optional PDSA link, required)
3. Has the change been sustained for an appropriate number of points? (rule-of-thumb: ≥7)

Only when all three are confirmed does the recalculation commit. The justification is stored as part of the phase boundary and shown in tooltips on the chart. "Reluctant" (never recalculates) and "Shifty" (recalculates on noise) are the failure modes this prevents.

### 6.3 Splitting by sub-process

When the user thinks seasonality / day-of-week / shift effects are present, the app offers a **split** action that produces N charts, one per sub-process — explicitly the MDC alternative to rolling averages. Auto-detect candidates: day-of-week, weekend/weekday, in-hours/out-of-hours, school-term/holiday.

### 6.4 Targets

A target line can be added per measure. The app then:
- Computes the assurance icon
- Warns when the target falls inside process limits ("variation alone could meet or miss this — don't react to single crossings").

### 6.5 Equity-stratified measurement

The IHI *Health Equity Measurement Framework* (2024) sets out a four-step approach: identify focus, identify population, determine stratification attributes (race, ethnicity, language, disability, deprivation, age), and compute the metric across every stratum. The app supports this natively:

- Any measure can declare one or more **stratification attributes** drawn from its dataset.
- An "equity view" produces small-multiples — one SPC chart per stratum — plus an **equity gap** indicator (the difference between the best- and worst-performing stratum, plotted as its own SPC series over time so you can see whether the gap is widening or closing).
- The icon summary grid can be filtered by stratum or by gap size.
- For UK use, the default deprivation stratifier is **IMD decile** from the patient's postcode area; for international use, a generic ordinal "deprivation rank" field.

Equity isn't a separate module — it is a lens applied to every measure that has the right data.

### 6.6 Data input

- Manual entry (current contentEditable table — but rebuilt with proper inputs and keyboard nav)
- CSV upload with column mapping
- Paste from clipboard
- Excel paste preserving column structure
- Sample datasets for training

## 7. The unique value-add — incident analysis module

**Scope clarification.** This module does **not** manage incidents. The lifecycle — reporting, triage, investigation, RCA, sign-off, duty of candour, family liaison — sits with the trust's LFPSE-compliant Local Risk Management System (LRMS). What this module does is **consume** incident data exported from the LRMS and provide the analytical and theme-assessment tools that LRMS products do not — Pareto views, clustering, correlation with operational SPC measures, and linkage back to PDSA cycles and driver-diagram nodes.

**Aligned with PSIRF, not parallel to it.** The Patient Safety Incident Response Framework (in force across NHS England since 2023, in primary care from late 2024) explicitly calls for "a co-ordinated and data-driven approach" with "system-based approaches to learning" and "proportionate responses." PSIRF removed the binary serious-incident/non-serious distinction and pushed trusts toward thematic, cross-incident analysis — which is exactly what this module supports. The NRLS was decommissioned on 30 June 2024; current data lives in LFPSE.

The MDC and QI literature point at safety/incident data as one of the highest-value SPC use cases but stop short of operationalising cross-incident analysis. The PSIRF transition created the policy demand for it. That combined gap is what this module fills.

### 7.1 Imported incident schema

The shape the app expects from a CSV / API import (a read-only analytical view, not an authoritative record):

```
Incident {
  id, datetime, location (ward/site/coords), type, sub_type,
  severity (no harm / low / moderate / severe / death),
  free_text, contributing_factors[]
}
```

Within the app, an imported incident can be referenced from:
- The relevant SPC chart (as an annotation)
- The Pareto chart of incident categories
- The driver diagram leaf node it relates to

Linkages (to PDSA cycles, driver nodes, annotations) live in the SPC app's own data — they are not written back to the source system.

### 7.2 Incident tools

| Tool | Purpose | Source / rationale |
|---|---|---|
| **Pareto-by-category, drillable** | Where to focus first | MDC: Strengthening, p.20 — exact use case |
| **Type × location heatmap** | Surface co-occurrence clusters; sparkline per cell | Extends MDC §"more than one process" guidance |
| **Geographic / floor-plan density** | Hexbin or kernel density over coordinates / ward map | Generalises C-chart from time to space |
| **DBSCAN / HDBSCAN spatial clustering** | Statistically dense pockets, not just visually busy ones | Analyst-mode; avoids over-reading visual clusters |
| **Exposure-adjusted funnel plot** | Compare incident *rates* across wards/sites fairly | Direct MDC funnel-plot use case; avoids league-table trap |
| **Time-of-day × day-of-week heatmap** | Catches handover / shift / weekend effects | The split-by-sub-process tool, visualised |
| **Lagged cross-correlation between two series** | "Did agency-staffing usage 3 weeks ago predict medication errors?" | Hypothesis generation for the QI team |
| **Free-text theme clustering** | Embedding-based grouping of narrative descriptions; surfaces themes manual coding misses | Optional / opt-in |
| **Change-event before/after test** | When a PDSA cycle is logged, auto-run statistical tests on the linked incident series before/after | Closes the loop between PDSA and outcome |
| **Driver-linked auto-annotation** | Incidents tagged to a driver node automatically annotate that driver's measure chart | Closes the loop between incidents and the driver diagram |

### 7.3 Guardrails

These are inferential tools used by non-statisticians, so each output must show:
- The exposure denominator and how it was computed
- A "this could be chance" caveat sized to the data volume
- A confidence band, not a point estimate, wherever possible

Clustering outputs in particular must warn against single-cluster fixation — a cluster is a hypothesis, not a finding.

## 8. Exports and sharing

Two distinct export tracks: **presentation** (PDF / PPTX / image — one-way, not re-importable) and **archive** (round-trippable project data).

Presentation exports:
- **Single chart**: SVG and PNG.
- **Project report**: PDF with the icon summary grid, each measure's chart with annotations, and the latest PDSA entries.
- **Board pack**: PPTX with one slide per measure (icon row, chart, narrative).
- **Selective export**: when generating a report or board pack, pick which artefacts to include — e.g. three of five measures, omit incident analysis, include driver diagram. Default is "everything"; selection persists per project as a named "view" so repeat board cycles don't rebuild it each month.

Archive and sharing:
- **`.spcproj` archive**: zip containing JSON for project structure (aim, drivers, measures, PDSA log, annotations, phase boundaries) + CSVs for data series + imported incident dataset snapshot. Round-trippable — exporting and re-importing produces an identical project. The neutral interchange format between users, teams, and trusts.
- **Shareable link**: read-only project URL.
- **Template export/import**: a project shell (aim, driver diagram, measure definitions) without data, so teams can reuse another team's approach. A template is an `.spcproj` archive with the data series stripped.

## 9. Phasing

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Correctness** | P0.1–P0.7. Refactor SpcForm/SpcContainer into a project model. | XmR worked examples match published sources to 4 dp. All four rules implemented. No prop mutation. |
| **1 — Single-project MVP** | One project with one XmR chart, annotations, Measured-recalc flow, icon summary, CSV upload, PNG export. | A QI lead can run a real project end-to-end without leaving the app. |
| **2 — Tool set** | P/C/U charts, run chart, Pareto, funnel plot, target lines, sub-process split. | Replaces the MDC Excel toolkit for a typical project. |
| **3 — QI artefacts** | Driver diagram, PDSA log, aim statement, Ishikawa, process map. | A project contains every artefact named on the BGS QI Hub page. |
| **4 — Incident module** | Incident model, Pareto, type×location heatmap, exposure-adjusted funnel, change-event before/after test. | A safety lead can answer "where are we clustering, is it real, and is our PDSA helping" from inside the app. |
| **5 — Advanced correlation** | Geographic clustering, lagged cross-correlation, free-text themes, embedding-based clustering. | Analyst persona has tools not currently available in the NHS toolkit. |
| **6 — Collaboration** | Shareable links, comments, template marketplace, board-pack export. | A trust can adopt the app as its IPR (integrated performance report) replacement. |

## 10. Non-goals

- A general-purpose BI / dashboarding tool. We are not competing with Tableau / Power BI.
- An EHR or incident-reporting system of record. We consume LFPSE / LRMS exports for analysis and theme assessment; we do **not** manage the incident lifecycle (reporting, triage, investigation, RCA, sign-off, duty of candour). The trust's LFPSE-compliant LRMS remains authoritative and is the system PSIRF responses live in.
- A statistics teaching app. Educational tooltips are fine; lectures are not.
- Predictive forecasting on SPC series. Out of scope per MDC philosophy ("plot the dots" not "extrapolate them").

## 11. Competitive landscape and positioning

The space already has occupants. Honest assessment of who they are and where the differentiation lies:

| Competitor | What they do well | Gap this app fills |
|---|---|---|
| **Life QI** (UK, NHS-popular) | The de facto NHS QI project platform: driver diagrams, PDSA, run charts, SPC, organisation portfolios, collaboration | Generic charting, no published claim of strict MDC-correct XmR maths; no incident analysis; no Variation/Assurance icon report; no equity stratification |
| **NHS-R `NHSRplotthedots`** | The MDC-correct reference implementation in R | Library for analysts, not a workspace; no UI, no project model, no PDSA / driver diagram / incident tools |
| **NHS Improvement Power BI templates** | Free, integrate with trusts' existing BI stacks | Power BI skill gap; no project workspace; no incident analytics; recalculation is manual |
| **Minitab / JMP / STATGRAPHICS** | Industrial-grade SPC, validated for regulated environments | Manufacturing-shaped, not healthcare; no QI workflow; per-seat licensing prohibitive for NHS |
| **Excel** (NHS Improvement spreadsheet) | Already on every NHS desktop | No collaboration, no project model, version-control nightmare, error-prone |

**Positioning:** *the only tool that is MDC-correct **by construction** (auditable against NHSRplotthedots), built around the PSIRF-aligned incident analysis workflow, with the QI artefact set Life QI offers and the icon summary report MDC defines.* The combination of all four is the moat — not any one of them individually.

## 12. Distribution and adoption channels

The QI community in the UK is small, networked, and has well-defined distribution paths. The app should be designed to ride them, not bypass them:

- **Q Community (Health Foundation)** — thousands of QI practitioners across the UK and Ireland; runs Q Exchange funding rounds and topic-focused groups. A Q Lab or Q Exchange application is a realistic route to early traction.
- **Health Innovation Networks (formerly AHSNs)** — the 15 regional networks have remit to spread proven innovations across their geographies.
- **NHS England Making Data Count team** — actively curating tools that conform to their methodology; an endorsement is the single highest-impact distribution event possible.
- **NHS-R community** — if the app exports to and imports from `NHSRplotthedots` cleanly, that community becomes a power-user evangelist base.
- **IHI Open School / Quality Improvement Essentials Toolkit** — international expansion route; aligning vocabulary (SBAR, driver diagram, PDSA) with IHI lets the app travel to IHI-aligned health systems in Ireland, Scandinavia, Australia, Canada and the US.
- **Royal colleges and specialty societies** (BGS is one example) — each runs QI conferences with poster sessions; the app should produce posters as a native export format alongside PDF/PPTX.

This implies two technical commitments worth flagging in the plan:
- **Round-trip with NHSRplotthedots** is a non-negotiable feature, not a nice-to-have (see §4).
- **A poster export template** (A0/A1, ratio-correct, with QI-conference standard sections) joins PDF/PPTX/PNG as a first-class artefact in §8.

## 13. Open questions

- Do we standardise on the NHS *Making Data Count* icon set verbatim, or design our own?  Verbatim has recognition benefits in the NHS; custom is friendlier for non-NHS adopters.
- Persistence model: local-first (IndexedDB) with optional cloud sync, or cloud-first with offline cache? Local-first removes the data-governance blocker for many NHS trusts.
- Auth and data-residency story for trusts handling PID — out of scope for v2 plan, but blocks phase 6.
- Free-text clustering needs an embeddings provider; default to local (e.g. all-MiniLM via WASM) to keep narratives off third-party APIs.
- LFPSE export format is JSON-schema-defined but trusts each customise their LRMS — does the app target the LFPSE canonical schema, the half-dozen most-used LRMS exports (Radar, Ulysses, InPhase, the Datix legacy CSV), or both?
- How aggressively to court Life QI users — head-to-head, or position as the analytics layer they bolt onto Life QI for the parts Life QI doesn't do?
- IHI Open School certification alignment: worth pursuing as a credibility lever for international expansion?
