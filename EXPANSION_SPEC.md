# Healthcare BI Dashboard — Expansion Spec

## Context

The baseline application is already built and functional. It provides:
- SPC (Statistical Process Control) chart builder
- Streamlined data entry with drag-and-drop CSV upload, manual entry, and data validation
- Customisable chart output rendered on screen
- Download chart as image file
- JSON export/import for session persistence

**Do not modify or refactor existing SPC functionality.** All work described below is additive.

---

## Expansion Goals

Transform the app from a single-chart SPC tool into a lightweight healthcare BI workbench. Target audience is **non-technical NHS clinicians and managers** — the UX must remain accessible, guided, and low-friction throughout.

---

## 1. Dataset Manager

A centralised data layer that all chart builders draw from.

### Requirements
- User can upload multiple CSV files in a single session, each given a user-defined name (e.g. "ED Attendances Q1", "Bed Occupancy by Ward")
- Each dataset displayed as a named card showing: filename, row count, column headers preview, upload timestamp
- Datasets persist in app state for the session duration; included in JSON export/import
- Any chart builder can either:
  - **Reference a shared dataset** — select from the dataset manager by name, then map columns
  - **Use its own inline data** — per the existing SPC pattern (upload or manual entry scoped to that chart only)
- Datasets can be renamed or deleted from the manager
- Column type inference on upload (numeric, date, text) with ability to override

---

## 2. Chart Library

All charts must follow the same UX pattern:
1. Name the chart
2. Select or upload data (shared dataset or chart-specific)
3. Map columns to chart axes/dimensions via dropdown (never free-text)
4. Configure appearance (title, colours, labels, legend)
5. Preview renders live
6. "Add to Dashboard" button sends completed chart to dashboard as a tile
7. "Download as Image" remains available on every chart type

### 2a. Standard Chart Types

#### Bar Chart
- Vertical and horizontal orientation toggle
- Grouped and stacked variants
- Single or multiple series
- Optional target/threshold line overlay

#### Line Chart
- Single and multi-series
- Optional data point markers
- Optional trend line (linear regression)
- Date-aware x-axis with automatic tick formatting

#### Area Chart
- Single and stacked area variants
- Useful for part-to-whole over time

#### Pie / Donut Chart
- Configurable inner radius (pie vs donut)
- Labels: percentage, value, or both
- Max slice threshold — slices below N% grouped into "Other"

#### Scatter Plot
- X and Y axis column mapping
- Optional colour-by third dimension
- Optional bubble size fourth dimension

#### Box Plot / Violin Plot
- Distribution visualisation
- Group-by column support
- Outlier display toggle

### 2b. Healthcare-Specific Chart Types

#### Run Chart *(highest priority)*
- Time-series data plotted as line
- Median line calculated and displayed
- Run and trend rule annotations (highlight rule violations)
- Annotation markers for user-defined events (e.g. "Policy change", "New staff cohort")
- Closely related to SPC — share UI patterns where possible

#### Pareto Chart
- Bar + cumulative line combination
- Automatic 80/20 threshold line
- Frequency or percentage y-axis toggle
- Common use: complaint categories, incident types, prescribing errors

#### Funnel Plot
- For benchmarking organisations/sites against a population mean
- Plot each unit as a point, draw control limits as curves
- Identify outliers above/below limits
- Label outlier points with unit name

#### Heatmap
- Grid of rows × columns coloured by value
- Configurable colour scale (sequential, diverging)
- Cell value labels toggle
- Common use: ward × day-of-week activity, speciality × month volumes

#### Calendar Heatmap
- GitHub-style calendar grid coloured by daily value
- Date column + value column mapping
- Year/month navigation
- Common use: daily admissions, incidents, referrals over time

#### Demographic Pyramid
- Age band rows, male/female bars extending left/right
- Absolute count or percentage toggle
- Common use: patient population demographics

#### Waterfall / Variance Chart
- Sequential running total with positive/negative bars
- Start, end, and subtotal bar styling
- Common use: financial variance, activity variance vs plan

#### Gantt / Timeline Chart
- Task/milestone rows with start and end date bars
- Colour-by category or status
- Today line marker
- Common use: project plans, improvement programme timelines, audit cycles

### 2c. Content Tiles (non-chart)

#### KPI / Big Number Tile
- Single metric displayed large
- Optional comparison value + delta (▲▼ with colour coding)
- Optional sparkline underneath
- Label and unit suffix configurable

#### Narrative Text Block
- Rich text editor (bold, italic, bullet lists, headings)
- Used for commentary, interpretation, contextual notes alongside charts

#### Data Table Tile
- Tabular display of a dataset or subset
- Column show/hide
- Optional conditional formatting (highlight cells above/below threshold)
- Sortable columns
- Pagination for large datasets

#### Image / Logo Tile
- Upload PNG/JPG/SVG
- Resize handle on dashboard
- Used for trust logos, contextual photos, framework diagrams

---

## 3. Dashboard

### Layout
- Responsive column-snapping grid (12-column base, similar to Grafana)
- Tiles snap to column boundaries on drag; height is free-drag in row increments
- Minimum tile size: 3 columns × 2 rows
- Default tile sizes per type:
  - KPI tile: 3×2
  - Chart tile: 6×4
  - Text block: 6×3
  - Data table: 12×4
  - Image tile: 3×3

### Tile Management

#### Click-to-Edit (primary interaction)
- **Clicking anywhere on a tile opens the chart editor** in a full-screen or large modal panel, pre-populated with all existing settings and data
- The editor is the same chart builder used to create the chart — no separate "edit mode"; it is the same UI, just loaded with existing state
- Changes are previewed live within the editor before being committed back to the dashboard
- Saving closes the editor and immediately updates the tile on the dashboard
- Cancelling discards all changes and returns to the dashboard unchanged
- This click-to-edit behaviour must be clearly communicated to new users — show a brief "Click any chart to edit" hint on first dashboard load (dismissable, not shown again once dismissed)

#### Tile Controls (visible on hover)
- Controls appear as an overlay toolbar on tile hover, not permanently visible (reduces clutter for non-technical users)
- Controls:
  - **Drag handle** — top bar, cursor changes to grab
  - **Resize handle** — bottom-right corner
  - **Duplicate** — copies tile with all settings and data intact
  - **Remove** — with confirmation prompt before deletion
- The edit action is intentionally omitted from the hover toolbar — clicking the tile body is the canonical edit entry point

#### Tile State
- Tiles do not auto-refresh (static snapshot of data at time of creation)
- If the underlying shared dataset is modified in the dataset manager, tiles sourcing from it display a "Data updated — click to refresh chart" badge until the user re-opens and saves the chart editor

### Dashboard-Level Controls
- Dashboard title (editable)
- Add tile manually from dashboard (opens chart type picker)
- **Export dashboard as PDF** — full-page layout, print-optimised
- **Export dashboard as PNG** — single image
- **Save as JSON** — exports full dashboard state including all datasets, chart configs, tile positions, theme, and drill-through links
- **Load from JSON** — restores a previously saved dashboard

### Theme System

A global theme applies consistently across all chart tiles on the dashboard. Individual charts can override specific settings, but the theme provides sensible defaults throughout.

#### Theme Controls (accessible from dashboard toolbar)
- **Colour palette** — select from a set of named palettes:
  - NHS Standard (NHS Blue primary, accessible sequential/categorical palettes)
  - Monochrome
  - Pastel
  - High Contrast (WCAG AAA compliant)
  - Custom — user-defined hex colours in sequence
- **Font family** — select from a short list of safe web fonts (e.g. Arial, Frutiger/Inter, Georgia)
- **Font size scale** — Small / Medium / Large (scales all chart labels and titles proportionally)
- **Background colour** — white, light grey, dark (dark mode)
- **Grid lines** — show/hide, colour, weight
- **Border radius** — tile corner rounding (none / small / medium)
- **Chart border** — tile outline on/off

#### Theme Behaviour
- Theme changes apply immediately to all tiles on the dashboard — live preview, no save/apply step required
- Theme is included in JSON export/import
- Individual chart editors expose an "Override theme" toggle — when on, that chart's own colour/font settings take precedence over the dashboard theme
- Default theme on new dashboard: NHS Standard palette, Arial, white background

### Drill-Through

Drill-through allows a chart tile to act as a navigation link — clicking a data point or chart element opens a second, more detailed view or a linked dashboard. This enables summary → detail navigation without requiring separate application pages.

#### Implementation Model
- **Drill-through is configured per chart tile** in the chart editor, under a "Drill-through" tab
- Two drill-through target types:
  1. **Linked dashboard** — select another saved dashboard (loaded from JSON in session); the target dashboard receives a filter value derived from the clicked element (e.g. clicking a bar labelled "Ward 7" filters the target dashboard to Ward 7)
  2. **Filtered view** — opens a modal showing a filtered data table of the underlying dataset rows matching the clicked element (e.g. clicking a Pareto bar for "Falls" shows all Falls rows)

#### UX Pattern
- Charts with drill-through enabled show a subtle **drill icon** (e.g. a small arrow or magnifier) on hover over interactive elements
- Cursor changes to pointer on hoverable data points
- Clicking a data point triggers the drill action — does not open the tile editor (drill takes priority over edit when a data point is clicked; clicking the tile background/empty area opens the editor)
- A **breadcrumb bar** appears at the top of the dashboard when a drill filter is active, showing the active filter and a "Clear filter / Back" button
- Drill-through filter state is not persisted in JSON — it is session-only navigation state

#### Drill-Through Data Contract
- The clicked element must resolve to a **filter key and value** (e.g. `{ column: "Ward", value: "Ward 7" }`)
- Each chart type must define which element maps to which filter key:
  - Bar chart: clicked bar → x-axis category value
  - Pie/Donut: clicked slice → slice label
  - Heatmap: clicked cell → row label + column label (two filters)
  - SPC/Run/Line: clicked data point → x-axis value (date or category)
  - KPI tile: whole tile click → no filter, just navigation to target dashboard
- If a chart type cannot resolve a meaningful filter (e.g. scatter with no categorical axis), drill-through to filtered view is disabled; only linked dashboard navigation (unfiltered) is available

### Dashboard UX Constraints
- Non-technical audience: no code, no formula entry, no SQL
- All configuration via dropdowns, toggles, colour pickers
- Tooltips on hover for all controls explaining what they do
- Empty state guidance: show "Add your first tile" prompt with chart type picker

---

## 4. Data Handling Rules

- All data processing client-side only — no data leaves the browser
- CSV encoding: UTF-8 assumed, with graceful fallback for Windows-1252
- Max recommended dataset size: 50,000 rows (warn above this, do not block)
- Date parsing: attempt ISO 8601 first, then DD/MM/YYYY (NHS convention), then MM/DD/YYYY
- Numeric parsing: strip commas and £/% symbols before parsing
- Missing values: display count of nulls per column in dataset preview; charts handle nulls by gap (line) or omission (bar)

---

## 5. JSON Schema (Session Persistence)

The existing JSON export/import pattern must be extended to cover:

```json
{
  "version": "2.0",
  "exportedAt": "<ISO timestamp>",
  "datasets": [
    {
      "id": "<uuid>",
      "name": "ED Attendances Q1",
      "columns": [...],
      "rows": [...]
    }
  ],
  "charts": [
    {
      "id": "<uuid>",
      "type": "spc | run | pareto | bar | line | ...",
      "name": "My Chart",
      "datasetId": "<uuid or null if inline>",
      "inlineData": null,
      "config": { ... },
      "themeOverride": null,
      "drillThrough": {
        "enabled": false,
        "targetType": "filteredView | linkedDashboard",
        "targetDashboardId": "<uuid or null>",
        "filterColumn": "<column name or null>"
      }
    }
  ],
  "dashboard": {
    "title": "My Dashboard",
    "theme": {
      "palette": "nhs | monochrome | pastel | highContrast | custom",
      "customColours": [],
      "fontFamily": "Arial",
      "fontSizeScale": "medium",
      "background": "white | lightGrey | dark",
      "gridLines": true,
      "borderRadius": "small",
      "tileBorder": true
    },
    "tiles": [
      {
        "id": "<uuid>",
        "chartId": "<uuid>",
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 4
      }
    ]
  }
}
```

Backwards compatibility: if `version` is absent or `"1.0"`, treat as legacy SPC-only export and import into the SPC chart builder directly.

---

## 6. Build Order (Recommended)

1. **Dataset Manager** — foundational dependency
2. **Dashboard shell** — grid, tile rendering, drag/drop, JSON save/load, empty state
3. **Click-to-edit** — tile click opens chart editor pre-populated; cancel/save flow
4. **Theme system** — palette, font, background applied globally across all tiles
5. **PII detection** — runs on every upload before data is processed; onboarding acknowledgement screen
6. **Transformation log** — every automatic data transformation logged in plain English; chart-level ⓘ panel; user overrides
6. **Financial year awareness** — date axis, period labels, YTD; configurable FY start month
7. **Sample data + template library** — pre-built NHS dashboard templates with synthetic data
8. **Guided chart wizard** — question flow recommending chart type
9. **Automatic chart type suggestion** — column mapping inference
10. **Monthly refresh config** — refreshable dataset toggle and period/value column setup
11. **Monthly refresh entry flow** — append modal, single and multi-dataset
12. **Extended file upload** — JSON, XML, ODS, clipboard paste
13. **NHS Fingertips API** — pre-built source, no auth required
14. **KPI tile + Text block + Image tile** — no charting logic, validates dashboard plumbing
15. **Data Table tile**
16. **KPI targets, descriptions and actions** — per-tile Details panel
17. **RAG consistency rules** — dashboard-level shared thresholds
18. **Metric library** — reusable metric definitions
19. **Annotation library** — reusable chart annotations
20. **Data freshness indicator** — per-tile last updated label with staleness warning
21. **Run chart** — highest clinical priority, shares patterns with SPC
22. **Bar chart + Line chart** — highest general utility
23. **Pareto chart**
24. **Heatmap + Calendar heatmap**
25. **Pie/Donut + Area + Scatter**
26. **Integrated national benchmarks** — Fingertips-sourced reference lines
27. **Screen reader data tables** — accessible table toggle on every chart tile
28. **Individual chart export** — copy as image, SVG, CSV, copy data as table
29. **Dashboard snapshot** — freeze, name, store, history panel
30. **Shareable view link** — read-only URL with expiry and password options
31. **Comments on shared views**
32. **Standalone board paper Word export** — server-side docx generation
33. **SharePoint / OneDrive integration** — Microsoft OAuth
34. **Google Sheets integration** — Google OAuth
35. **Webhook ingestion endpoint** — per-dataset URL, Next.js API route
36. **Scheduled email export** — pro/trust tier; auto-snapshot and send
37. **Embed code** — iframe snippet for intranet/website embedding
38. **Drill-through** — filtered view first, linked dashboard second
39. **Scorecard** — spec to be completed before build begins
40. **Presentation Mode 1 (Story mode)** — scripted dashboard walkthrough, step authoring, focus/dim, commentary, drill-through automation
41. **Presentation Mode 2 (Slide deck)** — free-canvas slide builder, chart/KPI/text/image elements, layouts, presenter view
42. **PowerPoint export** — from slide deck mode
42. **Welsh language support** — i18n architecture; EN + CY
43. **Dashboard template sharing** — export/import template JSON
44. **Change history log**
45. **Trust admin: usage analytics**
46. **Trust admin: org-wide theme and theme lock**
47. **Trust admin: mandatory metadata fields**
48. **Trust admin: dashboard review reminders**
49. **Funnel plot**
50. **Gantt / Timeline**
51. **Demographic pyramid + Waterfall + Box plot**
52. **Example library** — read-only demo dashboards with synthetic NHS data, gallery UI, "use as starting point" copy flow, "What am I looking at?" annotation layer
53. **Quick-start walkthroughs** — spotlight overlay system, 5 core walkthroughs, localStorage seen-state
54. **Feature spotlight cards** — contextual single-card tips on first encounter with key features, dismissable
55. **In-app help panel** — searchable article drawer, contextual "Learn more" links from all major feature areas

---

## 7. Hard Constraints

- **Do not modify existing SPC chart builder** — it is in production use
- **No server-side processing** — fully client-side, no backend required
- **No login/auth** — stateless, session-based only
- **No SaMD features** — no automated clinical interpretation, no patient-specific calculations, no diagnostic outputs
- **Accessibility** — WCAG 2.1 AA minimum; all charts must have descriptive aria-labels and text alternatives
- **NHS audience** — default colour palettes should avoid red/green combinations alone (colour blindness); use NHS blue as primary brand colour where applicable

---

## 8. Out of Scope (this phase)

- User accounts or server-side persistence
- Real-time data connections or API integrations
- Scheduled refresh
- Sharing dashboards via URL
- Role-based access control
- AI-generated commentary or interpretation

---

## 9. Monthly Data Refresh

### Problem
Dashboards used for recurring assurance reporting (monthly board reports, quality scorecards) require new data each period. Re-uploading full CSV files, remapping columns, and rebuilding charts is too high-friction for non-technical users doing a routine monthly update.

### Solution: Append Mode
A lightweight "Add new period" flow that surfaces only the data entry fields needed for the new time period, without touching any existing data, chart config, or dashboard layout.

---

### Marking a Dataset as Refreshable
- In the Dataset Manager, each dataset has an optional **"Enable monthly refresh"** toggle
- When enabled, the user configures:
  - **Period column** — which column holds the time period identifier (date column, or a "Month" text column)
  - **Value columns** — which columns require a new value each period (numeric columns only; multi-select)
  - **Period format** — how new period labels are generated (e.g. `MMM YYYY` → "Jul 2025", or free text)
  - **Period interval** — Monthly (default), Weekly, Quarterly, or Custom (user defines label manually each time)
- Configuration is stored in the dataset definition and included in JSON export

---

### Monthly Refresh Entry Flow
- A **"Add new period"** button is available from:
  - The **dashboard toolbar** — triggers a combined form across all refreshable datasets on that dashboard
  - Each individual **dataset card** in the Dataset Manager — triggers for that dataset only
- The flow opens a **compact modal** (not the full dataset editor):
  - Auto-populated **period label** derived from the last period + one interval (e.g. last entry "Jun 2025" → pre-fills "Jul 2025"); user can override
  - One clearly labelled input field per configured value column
  - Previous period's value shown as a hint beneath each field (e.g. "Last month: 4,231")
  - Input validation applies (numeric, range checks if configured on that column)
  - **Submit** appends the new row(s) to the in-memory dataset and immediately re-renders all charts sourcing from it
  - **Cancel** discards with no changes

---

### Multi-Dataset Dashboard Refresh (Primary Use Case)
- Triggering "Add new period" from the **dashboard toolbar** aggregates all refreshable datasets on that dashboard into a **single combined form**
- Datasets grouped by name with a clear section heading
- Field order within the form matches the order datasets appear in the Dataset Manager (user can reorder there to control the prompt sequence)
- Example: a dashboard with 4 refreshable datasets each with 1 value column produces a single modal with 4 number inputs — the user fills them in, hits Submit, and all charts update

---

### Audit and Metadata
- Each appended row is tagged internally with `_appendedAt` (ISO timestamp) — not visible in charts, stored in JSON only
- Dataset Manager cards show a **"Last refreshed: [date]"** label for refreshable datasets
- The JSON schema dataset object is extended:

```json
{
  "id": "<uuid>",
  "name": "ED Attendances",
  "refreshConfig": {
    "enabled": true,
    "periodColumn": "Month",
    "valueColumns": ["Attendances", "Admissions"],
    "periodFormat": "MMM YYYY",
    "periodInterval": "monthly"
  },
  "columns": [...],
  "rows": [
    { "Month": "Jun 2025", "Attendances": 4231, "Admissions": 812, "_appendedAt": "2025-06-30T09:14:00Z" }
  ]
}
```

---

## 10. Scorecard Chart Type

A dedicated scorecard chart type will be added to the chart library. Full specification to follow once a reference example is provided.

**Known requirements:**
- Tabular / matrix layout — rows are metrics/KPIs, columns are time periods
- Visual indicators per cell: RAG status, trend arrows, or both
- Integrates with the monthly refresh flow — each new period appends a column automatically
- Exportable as image; renderable as a dashboard tile
- Non-technical authoring: RAG thresholds set via simple comparators (e.g. "> 95% = Green, 85–95% = Amber, < 85% = Red") not formula entry

*Full spec to be completed when reference example is provided by the user.*


---

## 11. Data Ingestion — Extended Sources

### Overview
The app is built on Next.js, enabling server-side API routes for OAuth flows, proxied data fetching, and webhook endpoints. The following ingestion methods are supported in addition to the existing Excel/CSV file upload.

### File Upload (Extended)
- **JSON** — direct upload of JSON arrays or objects; column mapping applied post-parse
- **XML** — parse to tabular structure; user selects the repeating node to treat as rows
- **ODS** — LibreOffice/OpenDocument spreadsheet format; some NHS orgs use by default
- **Clipboard paste** — user copies a table from Excel, a web page, or an email and pastes directly into a paste target; app detects tab/comma delimited structure and parses automatically; no file needed

### Microsoft SharePoint / OneDrive
- Single OAuth flow via Microsoft Identity Platform (covers both SharePoint and OneDrive — same credential)
- User authenticates once; token stored server-side per user session / account
- File picker UI: browse SharePoint sites and OneDrive folders, select an Excel or CSV file
- Column mapping applied after file is selected
- **Linked source refresh**: if a dataset is linked to a SharePoint/OneDrive file, a "Sync latest" button re-fetches the file and appends or replaces rows (user configures append vs replace per dataset)
- Integrates with monthly refresh flow — "Add new period" can trigger a SharePoint sync rather than manual entry if the source file is updated by another team

### Google Sheets
- OAuth via Google Identity Platform
- Sheet picker: select a Google Sheet and a specific tab/sheet within it
- Column mapping applied after sheet is selected
- Linked source refresh: same append/replace pattern as SharePoint
- Less common in NHS but supported for completeness

### NHS Fingertips API
- Pre-built data source — no auth required (public API)
- User searches by indicator name or code (e.g. "Emergency admissions", "HSMR")
- Selects geography level (national, regional, ICB, trust, GP practice)
- Selects date range
- Data returned as a structured dataset ready for column mapping
- Displayed as a named dataset in the Dataset Manager like any other source
- Refresh pulls latest published data from Fingertips on demand
- This is a client-side fetch proxied through a Next.js API route to avoid CORS issues

### Incoming Webhook (Per Dataset)
- Each dataset in the Dataset Manager can have a **unique webhook URL generated** (Next.js API route)
- Any system capable of HTTP POST can push data rows to this URL
- Payload format: JSON array of objects, column names as keys
- On receipt: rows appended to the dataset; all charts sourcing from it re-render on next dashboard load
- Webhook URL is scoped to the user account (requires accounts phase) — unauthenticated in phase 1 via obscure UUID URL, bearer token authenticated in accounts phase
- Use cases: automated feeds from trust reporting systems, Zapier/Make automations, Power Automate flows
- Webhook activity log available in Dataset Manager (last received, row count, timestamp)

### Out of Scope (This Phase)
- Direct SQL / database connections
- ODBC / JDBC
- Model Hospital / SDCS API (auth complexity)
- Zapier / Make native connector (build webhook first; connector follows naturally)
- NHS SPINE / HL7 / FHIR data sources

---

## 12. User Accounts — Phase 2 Roadmap

*This section defines the intended architecture for user accounts. Claude Code should not build this now but must ensure current implementation does not foreclose these options.*

### Auth Strategy
- **NextAuth.js (Auth.js)** — standard Next.js authentication library
- Providers to support:
  - **Microsoft** (primary — NHS users authenticate with NHS/trust Microsoft accounts; same OAuth credential as SharePoint integration — one auth setup serves both)
  - **Google**
  - **Email + password** (magic link preferred over stored passwords)
- Microsoft login should be the default and most prominent option on the sign-in screen for NHS audience

### What Accounts Unlock
- Cloud-persisted dashboards — no more JSON download/upload as primary save (JSON export retained as a portable backup/share mechanism)
- Multiple dashboards per user
- Dashboard sharing via link — view-only or collaborative edit
- Public dashboard URLs — for openly published trust-level data
- Linked source credentials (SharePoint, Google Sheets tokens) stored server-side per user
- Webhook URLs scoped and authenticated per user account

### Tier Model (Indicative)

| Tier | Target | Key Features |
|---|---|---|
| Free | Individual clinicians / analysts | 3 dashboards, manual upload only, no sharing, JSON export |
| Pro | Power users | Unlimited dashboards, SharePoint/Google Sheets integration, sharing links, cloud save |
| Trust / Org | NHS trust procurement | Team workspaces, shared datasets, SSO, audit log, DPA in place, DSPT-aligned hosting |

### Architectural Requirements (Must Not Be Foreclosed)
- All dashboard and dataset state must be serialisable to JSON — this is already the case and must be maintained; it becomes the database storage format
- No client-side-only state that cannot be round-tripped through a server — avoid `localStorage` or `sessionStorage` as the source of truth
- Dataset IDs and chart IDs must be stable UUIDs — already specced; required for server-side foreign keys
- Next.js API routes used for all external integrations from day one — avoids client-side CORS issues and positions correctly for server-side auth token handling

### Data Residency
- UK region hosting mandatory for NHS trust tier: **Azure UK South** or **AWS eu-west-2**
- Data residency commitments must be documented in the DPA before any trust-tier account is activated
- Free and Pro tiers: UK hosting strongly preferred; must be stated clearly in privacy policy

---

## 13. Data Governance and Patient Safety

### Core Product Principle
This platform is designed exclusively for **aggregate, anonymised, population-level data** — activity volumes, waiting times, quality metrics, financial figures, workforce data. It is not a clinical system and must never be used to process patient-identifiable information.

This principle must be communicated at every touchpoint: onboarding, data upload, terms of service, and marketing.

---

### Technical PII Detection Controls

#### On Every Data Upload (File, Paste, or API)
Before any data is processed or stored, a client-side PII scan runs against column headers and a sample of row values (first 100 rows). The following patterns are flagged:

| Pattern | Detection Method |
|---|---|
| NHS Number | 10-digit numeric string matching NHS number format and check digit algorithm |
| NI Number | Regex: `[A-Z]{2}[0-9]{6}[A-D]` |
| Date of birth | Column header contains "dob", "date of birth", "birth date", "born" (case-insensitive) |
| Name columns | Header contains "firstname", "lastname", "surname", "patient name", "full name" |
| Email address | RFC 5322 email pattern in values |
| Postcode + name combination | Postcode pattern present alongside a name-like column in same dataset |
| Free text fields | Columns with high cardinality string values and no numeric content (potential narrative / notes fields) |

#### On Flag
- Upload is **paused** — data is not imported
- A prominent warning modal is displayed identifying which columns triggered the flag and why
- User is presented with three options:
  1. **Remove flagged columns and continue** — strips the flagged columns before import
  2. **Cancel upload** — discards entirely
  3. **Acknowledge and continue anyway** — available only for false positives (e.g. a column called "Patient count" triggering a name heuristic); requires the user to type a confirmation phrase; logged against the session/account
- Option 3 acknowledgements are stored in audit log (accounts phase)

#### Column-Level Warnings in Dataset Manager
- Flagged columns that were imported (via option 3) retain a persistent warning badge in the Dataset Manager
- Warning is visible whenever the dataset is selected for chart building

---

### Onboarding Data Acknowledgement

On first use (and on account creation in the accounts phase), before any data upload is possible, the user must complete a mandatory onboarding screen:

- Clearly headed: **"Before you upload data"**
- States in plain English (not legal language): "This tool is for aggregate and anonymised data only. Do not upload data that identifies individual patients — including names, NHS numbers, dates of birth, or postcodes linked to individuals."
- Presents a short active checklist the user must tick:
  - "My data does not contain patient names"
  - "My data does not contain NHS numbers"
  - "My data does not contain dates of birth"
  - "My data does not contain any other information that could identify an individual patient"
- A **"What counts as identifiable data?"** expandable section with plain-English examples
- Requires active checkbox confirmation — not a single "I agree" button
- Confirmation is logged with timestamp (session or account)
- Shown once per account; re-shown if user has not uploaded data for 12 months

---

### Terms of Service Requirements

The ToS must explicitly state:
- Prohibition on uploading patient-identifiable data
- User's responsibility for ensuring data is appropriately anonymised before upload
- Platform's right to suspend accounts where PII upload is detected or reported
- That the platform is not a clinical system and carries no clinical safety certification for patient-level data processing
- Data retention and deletion commitments (cloud phase)

---

### Data Processing Agreement (DPA)

Required before any NHS trust uses the platform in any capacity beyond individual free-tier use:
- Compliant with UK GDPR Article 28
- Documents: data controller (trust) and data processor (Auxtechna Ltd) responsibilities
- Specifies: data categories processed (aggregate operational data only — no special category data), processing purposes, retention periods, sub-processors, international transfer safeguards
- Standard DPA template to be prepared before trust-tier launch; legal review required

---

### NHS Procurement Compliance (Trust Tier Prerequisites)

The following assessments are required before NHS trust procurement can proceed. They are not required for individual free/pro tier users.

| Assessment | Description | When Required |
|---|---|---|
| **DSPT (Data Security and Protection Toolkit)** | NHS England annual self-assessment covering data security, staff training, system controls | Before any trust signs a contract |
| **DTAC (Digital Technology Assessment Criteria)** | NHS England framework covering clinical safety, data protection, technical security, usability, interoperability | Before trust-wide deployment |
| **DCB0129 Clinical Safety Case** | Clinical risk management during development — Rufus carries this obligation as clinical safety officer | Maintain throughout development |
| **DCB0160 Clinical Safety Case** | Clinical risk management during deployment — trust's obligation, supported by supplier documentation | Trust's responsibility; supplier provides hazard log and safety case report |
| **Cyber Essentials Plus** | NCSC certification; often required by NHS procurement | Before trust-tier launch |
| **ISO 27001** | Information security management; may be required by larger trusts | Roadmap item |

---

### Clinical Safety Obligations (DCB0129/0160)

As the platform's clinical safety officer under DCB0129, the following must be maintained:
- **Hazard log** — maintained throughout development; updated with each significant feature addition
- **Clinical safety case report** — documents that the platform presents acceptable clinical risk
- **Safety by design** — the PII detection controls, SaMD boundary maintenance, and no-patient-data principle are all safety design decisions and should be documented as such in the clinical safety case
- The expansion features described in this spec (new chart types, dashboard, data ingestion) must each be assessed for new hazards before release

---

### What This Platform Is Not

To maintain clear SaMD boundary and support clinical safety documentation:
- No patient-specific outputs of any kind
- No clinical decision support
- No diagnostic or prognostic outputs
- No automated interpretation presented as clinical guidance
- Chart description auto-generation (Section 7 feature) must be framed as descriptive statistical summary only — never as clinical interpretation


---

## 14. Board Report Export and Snapshots

### Problem
Board and committee reports in NHS organisations are collaborative Word documents with multiple contributors. A clinician or analyst building a dashboard needs to be able to extract charts and data into that existing document, not generate a parallel standalone report. A standalone paper output is also useful for single-author submissions.

---

### Individual Chart / Tile Export

Every chart tile must support the following export options, accessible from the chart builder and from the dashboard tile hover menu:

- **Copy as image** — copies a high-resolution PNG of the chart to the clipboard; user pastes directly into an existing Word document, PowerPoint slide, or email; this is the primary workflow for multi-contributor board reports
- **Download as PNG** — saves a high-resolution PNG; existing behaviour, retained
- **Download as SVG** — vector format; scales without quality loss for print
- **Download as CSV** — the underlying data behind the chart; for committees that want the numbers alongside the visual
- **Copy data as table** — copies the underlying dataset as a formatted table to clipboard; pastes natively into Word as an editable table

All exports are named automatically: `[Chart Name] — [Dashboard Name] — [Date].ext` (e.g. `ED Attendances SPC — Quality Dashboard — Jun 2025.png`)

---

### Dashboard Snapshot

A snapshot is a **frozen, timestamped copy** of the entire dashboard — data and layout captured at a specific point in time. It is not a live view. Once taken, the snapshot never changes regardless of subsequent data updates.

#### Taking a Snapshot
- **"Take snapshot"** button in the dashboard toolbar
- User is prompted for:
  - **Snapshot name** — pre-filled with `[Dashboard Name] — [Month] [Year]` (e.g. "Quality Dashboard — Jun 2025"); user can override
  - **Notes** — optional free text (e.g. "For June Board meeting — data as of 26 June")
- Snapshot is saved immediately; confirmation shown with a link to view it

#### Snapshot Storage
- Phase 1 (pre-accounts): snapshots saved as downloadable JSON files using the existing export pattern; user manages their own archive
- Phase 2 (accounts): snapshots stored server-side per user account; listed in a Snapshot History panel ordered by date

#### Snapshot History
- Accessible from the dashboard toolbar — "View snapshots"
- Lists all snapshots for the current dashboard: name, date taken, notes
- Each entry has:
  - **View** — opens the frozen snapshot in read-only mode
  - **Share** — generates a shareable link (see below)
  - **Export as Word** — generates a standalone board paper (see below)
  - **Download JSON** — portable backup
  - **Delete**

---

### Standalone Board Paper Export (Word)

For single-author submissions or standalone committee papers, a snapshot can be exported as a formatted Word document.

#### Document Structure
- Trust logo (if uploaded as an image tile or configured in account settings)
- Report title (snapshot name)
- Reporting period and date generated
- Optional executive summary text field (prompted at export time — free text, not pre-filled)
- Each dashboard tile rendered in order (left to right, top to bottom):
  - Chart tiles: full-width image + data table beneath (toggleable — table can be suppressed)
  - KPI tiles: formatted as a summary table row
  - Narrative text blocks: rendered as body text with heading preserved
  - Image tiles: rendered inline
- Page numbers, header with report title, footer with "Generated by [platform name] on [date]"
- File named automatically: `[Snapshot Name].docx`

#### Word Export Technical Notes
- Generated server-side using a Next.js API route and a docx generation library (e.g. `docx` npm package)
- Charts rendered as images server-side (headless chart rendering) before being embedded
- User does not need Word installed — file downloads directly

---

### Shareable View Link

A read-only URL that renders a frozen snapshot in the browser. The recipient does not need an account.

#### Behaviour
- Link renders the snapshot exactly as it appeared when taken — data frozen, layout frozen
- All interactive features work in view-only mode: tooltips, drill-through (filtered view only — linked dashboard drill requires the target dashboard to also be shared)
- No editing controls visible
- A **"View live dashboard"** prompt shown if the viewer has an account and access — links to the live version
- A **"Request access"** prompt for viewers without an account

#### Link Configuration (set at share time)
- **Expiry** — Never / 30 days / 90 days / Custom date
- **Password protection** — optional; recipient prompted for password before viewing
- **Allow data download** — toggle; if off, CSV/PNG export buttons are hidden in the shared view

#### Link Management
- All active share links listed in Snapshot History with status (active, expired)
- Links can be revoked at any time
- Link access log: view count, last accessed (no PII — no IP logging)

---

## 15. KPI Targets, Descriptions, and Actions

### Overview
Each KPI tile and chart tile on the dashboard can be enriched with target values, a plain-English description of what the metric represents, and a structured list of actions being taken to meet the target. This supports the common NHS use case of building a dashboard that not only shows performance but documents the improvement plan alongside it.

This feature is deliberately lightweight — it is documentation attached to a chart, not a full project management or risk register system.

---

### Per-Tile Metadata Panel

Every chart tile and KPI tile has an optional **"Details"** panel, accessible by clicking a dedicated icon in the tile hover toolbar (separate from the main click-to-edit behaviour which opens the chart builder).

The Details panel contains:

#### Description
- Free text field — plain English explanation of what this metric measures, why it matters, and how it is calculated
- Rendered beneath the chart in presentation mode and in standalone board paper exports
- Markdown supported (bold, italic, bullet lists) — rendered not raw

#### Target
- **Target value** — numeric; displayed as a reference line on applicable chart types (line, bar, SPC, run chart) and as a comparison figure on KPI tiles
- **Target label** — e.g. "National standard", "Trust trajectory", "NHSE threshold"
- **Target direction** — Higher is better / Lower is better / Within range
- **Target date** — the date by which the target should be met; displayed on the tile as "Target: 95% by Dec 2025"
- **RAG thresholds** — define Green / Amber / Red bands relative to the target (e.g. ≥95% Green, 85–94% Amber, <85% Red); drives KPI tile colour and scorecard cell colour

#### Actions
A simple list of actions being taken to meet the target. Each action has:
- **Description** — what is being done (free text, one to two sentences)
- **Owner** — free text name or role (not linked to a user account in phase 1)
- **Due date** — date picker
- **Status** — Not started / In progress / Complete / Overdue (Overdue auto-set if due date has passed and status is not Complete)
- Actions are listed in due date order
- Add / edit / delete actions inline in the Details panel

#### Actions Display on Dashboard
- A tile with actions attached shows a small **action count badge** (e.g. "3 actions") in the tile corner
- Clicking the badge opens the Details panel directly at the actions section
- Overdue actions show the badge in amber

---

### In Exports

#### Board Paper (Word export)
- Description rendered as body text beneath each chart image
- Target and RAG status rendered as a formatted line: "Target: 95% (National standard) by Dec 2025 — Current: 91% 🟡 Amber"
- Actions rendered as a table: Description | Owner | Due Date | Status

#### Shared View Link
- Details panel accessible in read-only mode — viewer can read description, target, and actions but cannot edit

#### Snapshot
- All Details panel content frozen with the snapshot — descriptions, targets, and action statuses captured at the point the snapshot was taken

---

## 16. Improvement Tracker — Phase 3 Concept

*Not in scope for current build. Documented here so Claude Code understands the intended direction and does not make architectural decisions that foreclose it.*

The KPI actions feature (Section 15) is intentionally designed as the seed of a broader improvement tracker. If NHS market demand justifies it, phase 3 would extend actions into a full improvement management module:

- Actions become first-class objects with evidence uploads, progress notes, and linked PDSA cycles
- Risk register integration — actions can be linked to a risk entry
- Improvement programme view — all actions across all dashboards shown in a single tracker with Gantt view
- This would position the platform as BI + Improvement in one tool — directly competing with standalone tools such as Kahootz, Smartsheet, and custom SharePoint implementations used by NHS trusts for improvement tracking
- Architectural requirement: action IDs must be stable UUIDs from phase 1 (already implied by the data model above) to allow future relational linking


---

## 17. Onboarding and Guided Experience

### Template Library

A curated set of pre-built dashboard templates for common NHS reporting use cases. Templates are the primary onboarding path for non-technical users — they provide an immediate starting point and demonstrate the platform's value before the user has uploaded any data.

#### Available Templates (Initial Set)
- **A&E Performance** — 4-hour standard, attendances, admissions, left without being seen, re-attendance rate
- **Referral to Treatment (RTT)** — incomplete pathways, 18-week standard, long waiters, specialty breakdown
- **Cancer Waiting Times** — 2-week wait, 31-day, 62-day standards by tumour group
- **Medicines Safety** — prescribing errors, near misses, omitted doses, high-risk medicines monitoring
- **Infection Prevention** — C. diff, MRSA, MSSA, gram-negative bloodstream infections, surgical site infections
- **Workforce** — vacancy rate, sickness absence, turnover, bank/agency spend, mandatory training compliance
- **Finance** — expenditure vs plan, CIP delivery, agency spend, cost per case
- **Patient Experience** — FFT scores, complaints, PALS contacts, themes over time
- **Quality Improvement** — SPC charts for improvement metrics, PDSA cycle tracking, run chart suite

#### Template Behaviour
- Each template ships with realistic synthetic NHS sample data pre-loaded so the user sees a fully populated dashboard immediately
- A **"Connect my data"** flow guides the user through replacing synthetic data with their own — column mapping wizard presented metric by metric
- Templates are duplicated into the user's account on selection — the original template is never modified
- Users can save their own configured dashboard as a custom template (accounts phase) and share it within their organisation (trust tier)
- Template library is accessible from the new dashboard creation screen and from an in-app template gallery

---

### Guided Chart Wizard

For users who want to build a custom chart but are unsure which type to use.

#### Wizard Flow
A short question sequence that recommends the right chart type:

1. "What are you trying to show?"
   - How something has changed over time → time-series branch
   - How categories compare to each other → comparison branch
   - What makes up a whole → composition branch
   - Whether two things are related → relationship branch
   - How my organisation compares to others → benchmarking branch
   - Whether a process is in control → statistical process control branch

2. Follow-up questions based on branch (e.g. for time-series: "Do you need to detect whether variation is significant?" → SPC; "No, just show the trend" → Run chart or Line chart)

3. Recommended chart type shown with a plain-English description and example image
   - "We recommend a Run Chart — this shows your data over time with a median line to help you spot trends and shifts"
   - "Switch to a different chart type" option always available

4. User proceeds into the standard chart builder for the recommended type, pre-configured where possible

#### Wizard Availability
- Shown by default for new users on first chart creation
- Accessible via a "Help me choose" link in the chart type picker for all users
- Can be disabled in user preferences for experienced users

---

### Sample Data

Every chart type in the library ships with a pre-loaded realistic NHS sample dataset:
- Sample data is clearly labelled as synthetic — a persistent "Sample data — replace with your own" banner
- "Use my own data" button replaces the sample with the user's upload or dataset selection
- Sample datasets are also available standalone in the Dataset Manager for exploration
- Sample data is never included in JSON exports (flagged and stripped at export time)

---

## 18. Collaboration Features (Accounts Phase)

### Comments on Shared Views

Recipients of a shared snapshot link can leave comments without needing edit access:
- Timestamped comments attached to the snapshot, not to individual tiles
- Tile-specific comments: user can click a tile then "Add comment" to pin a comment to that tile
- Threaded replies
- Resolve / unresolve status — resolved comments collapsed by default
- Dashboard owner receives email notification on new comment
- All comments visible to anyone with the share link (not scoped per viewer in phase 1)
- Comments are stored server-side, not in the snapshot JSON

### Dashboard Template Sharing

- A configured dashboard (with or without data) can be exported as a **template file** (JSON variant flagged as `type: "template"`)
- Templates can be shared with a colleague who imports it into their own account and populates with their data
- Useful for ICBs distributing a standard reporting template to provider trusts
- In trust tier: templates can be published to an organisation-wide template library accessible to all org members

### Change History

- Every save action on a dashboard (manual save, snapshot, data refresh) is logged
- Change log shows: timestamp, user, action type (data updated / chart edited / tile added / layout changed)
- Previous versions not fully restorable in phase 1 — log is informational only
- Full version restore is a phase 3 item

---

## 19. Chart Intelligence

### Automatic Chart Type Suggestion

When a user maps columns in the dataset manager or chart builder, the app infers the most appropriate chart type from the data shape:

| Data Shape | Suggested Chart |
|---|---|
| One date column + one numeric column | Run chart or Line chart |
| One date column + one numeric column (small dataset, improvement context) | SPC chart |
| One categorical column + one numeric column | Bar chart |
| One categorical column + numeric (part of whole) | Pie / Donut |
| Two numeric columns | Scatter plot |
| One categorical + one date + one numeric | Heatmap |
| Multiple numeric columns over time | Multi-series line |
| One categorical + frequency count | Pareto chart |
| Organisational unit + numeric (benchmarking) | Funnel plot |

- Suggestion shown as a highlighted recommendation — never forced
- "Why are we suggesting this?" tooltip with a one-sentence plain-English explanation
- User can ignore and select any chart type freely

### Data Freshness Indicator

- Every dashboard tile displays a **"Data as of [date]"** label in a subtle footer
- Date reflects when the underlying dataset was last updated (upload, refresh, or append)
- If data is older than a configurable threshold (default 35 days — one month + buffer), the label turns amber with a warning icon
- Configurable per dashboard: threshold can be set to match reporting cycle (weekly, monthly, quarterly)
- Included in board paper Word exports and shared views — critical for governance

### Annotation Library

- A reusable library of named annotations maintained at dashboard or organisation level
- Each annotation has: label (e.g. "Winter pressures"), date or date range, colour, optional description
- Annotations from the library can be applied to any compatible chart (SPC, run, line, bar) with one click
- Editing an annotation in the library updates it across all charts it has been applied to
- Common NHS annotations pre-seeded: "COVID-19 pandemic", "Winter pressures", "Bank holiday", "Strike action", "New policy / guideline", "System go-live"
- Custom annotations can be added and saved to the library

---

## 20. NHS-Specific Value Additions

### Financial Year Awareness

NHS organisations operate on an April–March financial year. The app must reflect this throughout:
- **Date axis default**: when a date column is detected, offer Financial Year (Apr–Mar) as the primary grouping option alongside Calendar Year and Calendar Month
- **Period labels**: financial year periods labelled correctly — "Q1 2025/26" (Apr–Jun 2025), not "Q2 2025"
- **Monthly refresh**: period interval defaults offer "Financial month" (M1–M12, April = M1) as an option alongside calendar month
- **Year-to-date calculations**: KPI tiles can show YTD figures based on financial year start
- **Configurable**: financial year start month is configurable at account/org level (default April; some organisations use different financial years)

### Integrated National Benchmarks

Where relevant chart types are used with metrics matching known national standards, offer to overlay the standard as a reference line:

| Metric Context | Benchmark |
|---|---|
| A&E 4-hour standard | 95% (historic), current NHSE operational standard |
| RTT 18-week incomplete | 92% |
| Cancer 62-day | 85% |
| C. diff / MRSA | Zero tolerance / NHSE trajectory |
| FFT recommend rate | National average (Fingertips) |

- Benchmarks sourced from NHS Fingertips API where available (live) or hard-coded with version date where not
- User can override or suppress any benchmark line
- Benchmarks displayed with a label and source citation on the chart

### RAG Consistency Rules

A common governance problem: the same metric appears green on one tile and amber on another because thresholds were set independently. RAG consistency rules prevent this.

- **Dashboard-level RAG rules** — define a named rule (e.g. "4-hour standard") with thresholds once at dashboard level
- Any KPI tile or scorecard cell can reference a named rule instead of defining its own thresholds
- Editing the rule updates all tiles referencing it simultaneously
- Rules are listed in a dashboard settings panel with a count of tiles using each rule
- Conflict warning: if a tile has its own thresholds that differ from a dashboard rule applied to the same metric, a warning badge is shown

### Metric Library

A reusable library of standard metric definitions, maintained at account or organisation level:

Each metric definition contains:
- **Name** — e.g. "Emergency 4-hour standard"
- **Description** — plain English explanation
- **Unit** — percentage, count, rate, £, days, etc.
- **Target value and direction**
- **RAG thresholds** (references a RAG consistency rule)
- **Data source hint** — where this metric is typically found (e.g. "ED system extract", "ESR", "Finance ledger")
- **Review frequency** — monthly, weekly, quarterly

When creating a KPI tile or chart, user can select a metric from the library — all metadata pre-fills automatically. Updating the metric definition propagates to all tiles using it (description, target, RAG thresholds — not data).

Pre-seeded with common NHS metrics. Organisation-level library (trust tier) allows a trust analytics team to define the standard metric set once for their whole organisation.

---

## 21. Export and Distribution

### Scheduled Email Export (Pro and Trust Tier)

- Per dashboard, configure a **recurring export schedule**:
  - Frequency: weekly, monthly, quarterly, or custom (cron-style, via UI picker not raw cron)
  - Day/time: e.g. "First Monday of the month at 07:00"
  - Format: PDF snapshot, PNG snapshot, or shareable view link
  - Recipients: comma-separated email addresses (not required to have accounts)
  - Subject line and optional message body configurable
- On trigger: snapshot is taken automatically at the scheduled time, export generated, email sent
- Schedule history: log of all sent emails with timestamp and recipient count
- Unsubscribe link included in every email for recipients
- NHS use case: board report PDF lands in committee members' inboxes the morning of the meeting without any manual action

### Embed Code

- Any shared dashboard snapshot or live dashboard can generate an **iframe embed snippet**
- Embed renders the read-only view of the dashboard
- Configurable dimensions (width/height) or responsive (100% width)
- Optional: hide the platform branding for trust tier (white-label embed)
- Use cases:
  - Embed a performance dashboard into a trust intranet SharePoint page
  - Embed a public-facing dashboard into a trust website
  - Embed into a digital board paper system
- Embed URLs are separate from share links — independently revocable
- Embed access log: view count, last accessed

---

## 22. Accessibility

### Screen Reader Optimised Data Tables

Every chart tile automatically generates an associated accessible data table:
- Toggle visible via a **"View as table"** button on every chart tile (visible always, not only on hover)
- Table contains the same data as the chart in a properly structured HTML table with `<caption>`, `scope` attributes, and appropriate ARIA roles
- In shared views and board paper exports, the data table is included beneath the chart image
- Meets WCAG 2.1 AA and NHS accessibility requirements for published digital content
- Screen reader users can navigate the data table without ever interacting with the chart canvas

### Welsh Language Support

- Full UI internationalisation (i18n) architecture from the start using `next-intl` or equivalent
- English (default) and Welsh language strings maintained in parallel translation files
- Language selector in user preferences and in the app header
- Date, number, and currency formatting follows locale conventions
- Pre-seeded NHS Wales terminology for relevant metric names and chart labels
- Rationale: NHS Wales is a realistic and distinct market; retrofitting i18n later is significantly more costly than building the architecture in from the start; other languages (e.g. for ICS areas with high non-English speaking populations) can be added incrementally

---

## 23. Trust Tier Governance and Administration

### Usage Analytics

A trust administrator dashboard showing:
- Active dashboards: count, owners, last modified, last viewed
- View activity: dashboard views over time (no PII — no individual user tracking beyond account-level)
- Snapshot history across the organisation: how many board reports generated per month
- Shared links: count of active links, expiry status
- Data sources: which integrations are in use (SharePoint, Fingertips, webhook, manual upload)
- User activity: last login per account (for licence management)
- Export as CSV for trust IT / information governance reporting

### Organisation-Wide Theme

- Trust administrator sets the organisation theme once:
  - Trust logo (used in board paper exports, dashboard header)
  - Primary and secondary brand colours
  - Font preference
  - Default RAG colour scheme
- All dashboards created within the organisation inherit the org theme by default
- Individual users can override theme on their own dashboards unless the administrator locks it
- Theme lock: administrator can enforce org theme on all dashboards (useful for standardised board reporting)

### Mandatory Metadata Fields

Trust administrator can configure which metadata fields are required before a dashboard can be shared or published:
- **Owner** — named individual responsible for the dashboard
- **Review date** — date by which the dashboard should be reviewed for accuracy
- **Data classification** — e.g. "Internal", "Board", "Public" (trust-defined classification scheme)
- **Directorate / department** — organisational unit
- Dashboards missing required metadata display a warning and cannot be shared until fields are completed
- Configurable per trust — no mandatory fields enforced by the platform itself

### Dashboard Review Reminders

- When a dashboard has a review date set, the owner receives an automated email reminder:
  - 2 weeks before the review date
  - On the review date if not yet reviewed
- "Mark as reviewed" action updates the review date to the next cycle (configurable: +1 month, +3 months, +6 months, +1 year)
- Overdue dashboards (review date passed, not marked reviewed) flagged in the trust admin usage analytics panel
- Prevents stale published dashboards with outdated data continuing to circulate


---

## 24. Presentation Mode

Two distinct presentation modes serve different use cases. Both are accessible from the dashboard toolbar via a "Present" button that opens a mode picker.

---

### Mode 1 — Dashboard Story Mode

A scripted, sequential walkthrough of an existing dashboard. The dashboard itself is the canvas — the presentation layer directs attention to specific tiles, overlays commentary, and can follow drill-through paths. Designed for live committee presentations where the presenter is walking the room through live or snapshot data.

#### Concept
The user pre-programmes a sequence of "steps". Each step focuses on one or more tiles, dims everything else, and displays a commentary panel. Steps can trigger drill-throughs, zoom into a chart, or pan across the dashboard. The result feels like a guided tour of the dashboard rather than a static slide deck.

#### Authoring a Story

Accessed via **"Edit story"** in the dashboard toolbar. Opens a story editor panel alongside the live dashboard:

- Steps listed in a sidebar (numbered, drag to reorder)
- Each step is configured with:
  - **Focus tile(s)** — select one or more tiles to highlight; all others dimmed to ~20% opacity
  - **Zoom level** — fit tile to screen / show in context of surrounding tiles / full dashboard overview
  - **Commentary** — rich text panel displayed alongside or below the focused tile (bold, italic, bullet lists); this is the presenter's spoken notes made visible for the audience
  - **Drill-through action** — optionally trigger a drill-through on a specific data point as part of the step transition (e.g. step 3 zooms to the Pareto chart, step 4 drills into the "Falls" category automatically showing the filtered data table)
  - **Transition** — None / Fade / Slide (subtle; not distracting)
  - **Duration** — for auto-advance mode (see below); seconds before automatically moving to next step
- Steps can be duplicated and reordered
- "Preview step" button renders the step as it will appear in presentation

#### Running a Story

- **"Present"** enters full-screen mode
- Navigation: keyboard arrow keys, presenter clicker (left/right), or on-screen forward/back buttons
- Optional **presenter view** — if two screens available, audience sees the focused dashboard view; presenter sees the current step, next step preview, and their commentary notes
- **Auto-advance mode** — steps advance automatically using configured durations; useful for unattended display (waiting room screens, digital notice boards)
- Drill-through steps execute automatically on transition — audience sees the drill animation
- **Laser pointer mode** — mouse cursor becomes a highlighted dot for pointing at chart elements
- Exit presentation returns to the dashboard in its normal state

#### Story Persistence
- Stories are saved as part of the dashboard JSON
- A dashboard can have multiple named stories (e.g. "Board presentation", "Team briefing", "Executive summary")
- Stories reference tile IDs — if a tile is deleted, affected steps are flagged with a warning in the story editor

---

### Mode 2 — Slide Deck Mode

A PowerPoint-style authoring experience where the user builds a sequence of slides. Each slide is a blank canvas onto which charts, KPI tiles, text, and images are placed. Unlike Mode 1, slides are independent of the dashboard layout — the user composes each slide individually. Designed for formal papers, away-day presentations, and situations where the presentation needs to stand alone without the dashboard.

#### Slide Canvas

- Each slide is a fixed-ratio canvas (16:9 default; 4:3 optional)
- Elements placed on the slide via drag from a panel:
  - **Chart** — select any chart from the current session's chart library; renders as a live-updating chart element (or frozen snapshot — user chooses)
  - **KPI tile** — single metric with target and RAG
  - **Text block** — free-placement rich text; font size, alignment, colour configurable
  - **Image** — upload or select from image tiles in the session
  - **Shape** — rectangle, circle, line, arrow; fill and border colour
  - **NHS logo / trust logo** — one-click insert from account settings
- Elements are resized and repositioned freely on the canvas (not grid-snapping — free placement like PowerPoint)
- Z-order control: bring forward / send back
- Element alignment guides snap to centre, edges, and other elements

#### Slide Management
- Slides listed as thumbnails in a left panel
- Add slide, duplicate slide, delete slide, drag to reorder
- Slide transitions: None / Fade (simple; no distracting animations)
- **Slide layouts** — optional starting point templates:
  - Title slide (large title + subtitle + logo)
  - Title + chart (50/50 split)
  - Title + chart + commentary (chart left, text right)
  - Two charts side by side
  - Full-bleed chart (chart fills slide, title overlaid)
  - KPI summary (2x2 or 3x3 KPI tile grid)
  - Blank

#### Presenter Notes
- Each slide has a notes field (not visible on the presented slide)
- Shown in presenter view during presentation

#### Running the Slide Deck
- Full-screen presentation mode
- Keyboard / clicker navigation
- Presenter view (two-screen): audience sees slide, presenter sees current slide + next slide + notes
- If a chart element is set to "live" (not frozen), it reflects the current data at presentation time

#### Export
- **Export as PPTX** — each slide exported as a PowerPoint slide; charts embedded as high-resolution images; text elements as editable text boxes where possible
- **Export as PDF** — print-optimised; each slide one page
- **Export as PNG sequence** — one image per slide; for pasting individually into other documents

#### Relationship to Dashboard
- Charts added to a slide deck are copied from the chart library — they are independent of the dashboard layout
- Changes to a chart in the dashboard do not automatically update the slide unless the element is set to "live"
- A slide deck is saved as a separate named object alongside dashboards in the account — not embedded within a dashboard

---

### Shared Behaviour (Both Modes)

- Both modes support full-screen presentation on an external display
- Both support presenter view when two screens are detected
- Both support keyboard and presenter clicker navigation
- Presentation sessions are not recorded or streamed by the platform (out of scope)
- Accessibility: both modes support keyboard-only navigation for the audience view; charts retain their accessible data table toggle


---

## 25. Data Transformation Transparency

### Principle

Any transformation the app applies to data automatically — whether during upload, chart building, SPC calculation, date parsing, or aggregation — must be fully disclosed to the user in plain English. The user must be able to understand exactly what was done to their data before it appears in a chart or export, and must be able to reproduce the output manually if required.

This is a patient safety and clinical governance requirement. NHS clinicians and managers presenting data to boards and committees are professionally accountable for the figures they present. If the app silently transforms data and the user cannot explain the output, this creates a governance risk and undermines trust in the platform.

---

### Transformation Log

Every dataset in the Dataset Manager has an associated **Transformation Log** — a persistent, human-readable record of every automatic transformation applied to that dataset from upload to chart output.

#### Accessing the Log
- Available via a **"View transformations"** button on every dataset card in the Dataset Manager
- Also accessible from within any chart builder using that dataset — a **"How was this data processed?"** link beneath the chart preview
- Shown automatically after any upload where transformations were detected — user must acknowledge before proceeding

#### Log Format
Each transformation is recorded as a numbered step in plain English:

```
Dataset: ED Attendances Q1
Transformations applied: 6 steps

1. FILE IMPORT
   Your file "ED_Attendances_Q1.xlsx" was uploaded containing 847 rows and 6 columns.
   No rows were removed at import.

2. DATE PARSING — Column "Month"
   The values in the "Month" column were interpreted as dates.
   Format detected: MMM-YY (e.g. "Apr-25" read as 1 April 2025).
   All 12 values parsed successfully. No ambiguous dates found.
   If this is incorrect, you can change the date format in Dataset Settings.

3. NUMERIC PARSING — Column "Attendances"
   3 values contained commas (e.g. "1,204"). Commas were removed before converting
   to numbers. This is standard formatting — no values were changed.

4. NUMERIC PARSING — Column "% Breaches"
   2 values contained a "%" symbol (e.g. "12.4%"). The "%" symbol was removed before
   converting to numbers. Values are stored as decimals (e.g. 12.4, not 0.124).
   Your chart axis has been labelled "%" to reflect this.

5. MISSING VALUES — Column "Admissions"
   1 row had a blank value in the "Admissions" column (Row 9, Month: Dec-24).
   This row has been retained in the dataset. Charts using this column will show
   a gap at December 2024 rather than treating the blank as zero.
   If the correct value is zero, you can edit this row in the dataset editor.

6. AGGREGATION — Chart "Monthly ED Attendances"
   The chart is grouped by Month. Where more than one row shares the same month,
   values in the "Attendances" column have been summed.
   Example: if January 2025 appears on 3 rows (31, 28, 44), the chart shows 103.
   No such duplicates were found in your data — each month appears once.
```

#### Log Principles
- Every step uses plain English — no statistical or technical jargon without a plain-English explanation immediately following
- Every step states what was done, why, and what the user can do if they disagree with the transformation
- Steps are numbered sequentially in the order they were applied
- No transformation is described as "automatic" or "standard" without explaining what that means in practice
- Where a transformation involved an assumption (e.g. date format inference), the assumption is stated explicitly and a correction path offered
- The log is read-only — it is a record, not an editor

---

### Transformations That Must Be Logged

The following categories of transformation must always generate a log entry:

#### Import and Parsing
- File format detection (CSV, Excel, JSON, XML, ODS, clipboard)
- Encoding detection and conversion (e.g. Windows-1252 → UTF-8)
- Header row detection (e.g. "Row 1 was identified as column headers")
- Date format inference — the detected format must be stated and an example shown
- Numeric parsing — removal of commas, currency symbols, percentage signs
- Boolean/text normalisation (e.g. "Yes/No" interpreted as true/false)
- Whitespace trimming from values

#### Data Quality Handling
- Missing value treatment — how blanks are handled (gap, zero, excluded) and where they occur (row number, column name)
- Duplicate row detection — whether duplicates were removed or retained
- Out-of-range value flagging — values that appear implausible (e.g. negative attendances)
- PII detection flags — which columns triggered a PII warning and why

#### Aggregation and Grouping
- Any grouping applied (e.g. grouping daily data to monthly for a chart)
- The aggregation function used (sum, mean, count, median, min, max) — stated explicitly
- The number of source rows contributing to each aggregated point

#### Statistical Calculations (SPC and Run Charts)
SPC and run charts apply the most complex transformations and require the most detailed explanation:
- Mean or median calculation — which was used and the computed value
- Sigma calculation method — which formula was applied (e.g. moving range method)
- Control limit calculation — upper and lower control limit formulae stated in plain English with the computed values
- Baseline period — which data points were used to calculate the baseline and why
- Rule detection — each rule applied (e.g. Rule 1: point beyond 3 sigma; Rule 8: 8 consecutive points on one side of mean) listed with the specific data points that triggered each rule
- Any data points excluded from baseline calculation and the reason

#### Derived Columns
- Any column the app creates that did not exist in the source data (e.g. a cumulative total column for a Pareto chart, a rolling average, a year-to-date figure)
- The formula used to derive the column, stated in plain English and as a formula
- Example: "A cumulative percentage column was calculated by dividing each category's count by the total count (1,247) and summing progressively. Formula: Cumulative % = (Running total of count ÷ 1,247) × 100"

#### Monthly Refresh Appends
- Timestamp of the append
- Which rows were added
- Which dataset the rows were appended to
- Whether any transformations were applied to the appended rows (date parsing, numeric cleaning, etc.)

#### National Benchmark Overlays
- Source of the benchmark (NHS Fingertips indicator ID and name, or hard-coded with version date)
- The exact value used as the benchmark
- Date the benchmark was last updated

---

### Chart-Level Transformation Summary

Every chart has a **"How was this calculated?"** panel accessible from:
- A small **ⓘ** icon in the chart builder beneath the preview
- The same icon on the dashboard tile (visible on hover)
- The shared view (read-only version of the same panel)
- The board paper Word export (included as an appendix per chart)

The panel shows a condensed, chart-specific summary — not the full dataset log, but the transformations relevant to that specific chart:

```
Monthly ED Attendances — Run Chart
Data source: ED Attendances Q1 (847 rows, uploaded 26 Jun 2025)

Steps applied to produce this chart:
1. Grouped by: Month (12 groups, 1 row per group — no aggregation needed)
2. Median calculated from all 12 data points: 1,183 attendances
3. Run rules checked: 8-point run rule, trend rule (5 consecutive rising/falling points)
   → No rule violations detected in this dataset
4. Benchmark overlay: NHS England 4-hour standard (95%) sourced from NHS Fingertips,
   indicator ID 90362, last updated March 2025

No data was excluded. 1 missing value in December 2024 shown as a gap.
```

---

### User Control Over Transformations

Where the app has made an assumption the user can override, a **"Change this"** link is shown inline in the transformation log step. Examples:

- Date format assumed incorrectly → "Change date format"
- Missing value treated as gap → "Treat as zero instead"
- Aggregation function defaulted to sum → "Change to mean / median / count"
- Baseline period auto-selected → "Change baseline period"

Changing a transformation setting re-runs all downstream calculations and updates the transformation log to reflect the new steps. The previous log is replaced — not appended — since the transformation history reflects the current state of the data, not its editing history (editing history is the change log in Section 18).

---

### Transparency in Exports

- **Board paper Word export**: a "Data and methodology notes" appendix is included at the end of the document; each chart's transformation summary is listed under its chart name
- **Shared view**: the ⓘ panel is available in read-only mode — committee members reviewing a shared link can see exactly how the data was processed
- **Snapshot**: transformation logs are frozen with the snapshot — the log reflects the transformations at the time the snapshot was taken, not any subsequent changes
- **CSV export**: a companion `_transformations.txt` file is included alongside the CSV describing all transformations applied to that dataset

---

## 26. Example Library and Tutorials

### Overview

Non-technical NHS users often know they need to improve how they present data but do not know where to start. A curated example library and embedded tutorial system lowers the initial barrier, demonstrates the platform's capabilities in a recognisable NHS context, and reduces reliance on external training. This is a retention and adoption feature as much as a learning one — users who find value quickly are users who return and recommend.

---

### Example Library

A browseable gallery of fully-built, interactive example dashboards covering common NHS reporting scenarios. Unlike templates (which are blank starting points the user populates with their own data), examples are **read-only demonstrations** — the user views them to understand what the platform can do, then optionally copies one as a starting point.

#### Example Set (Initial)

| Example | Key charts shown | Learning goal |
|---|---|---|
| **A&E Four-Hour Standard** | SPC chart, Run chart, KPI tiles, Funnel plot | Variation analysis, target tracking, benchmarking |
| **RTT 18-Week Pathway** | Line chart with annotations, Waterfall, Data table | Trend monitoring, backlog decomposition |
| **Monthly Board Report** | KPI grid, Bar charts, Text commentary, Snapshot | Board-ready layout, commentary, snapshot workflow |
| **Infection Prevention** | Calendar heatmap, SPC chart, Pareto | Temporal patterns, root cause analysis |
| **Workforce Dashboard** | Pyramid chart, Gantt, KPI tiles | Demographic analysis, project timelines |
| **Financial Variance** | Waterfall, Bar chart (grouped), KPI tiles | Variance decomposition, budget vs actuals |
| **Improvement Programme** | Run chart, Gantt, PDSA-style annotations | QI methodology, showing change over time |
| **Patient Experience** | Pie/Donut, Bar chart, Scatter | Feedback themes, satisfaction drivers |

#### Example Behaviour

- Each example ships with realistic synthetic NHS data pre-loaded — the user sees a fully live, interactive dashboard immediately
- Examples are **view-only** — no editing controls are shown; the user can explore tooltips, drill-throughs, and annotations
- A prominent **"Use this as a starting point"** button copies the example into the user's working session as an editable dashboard with the synthetic data attached
- A **"What am I looking at?"** panel (collapsible, shown by default on first visit) explains the purpose of each tile on the example dashboard in plain English — a guided annotation layer that disappears once the user has read it
- Examples are accessible from:
  - The empty dashboard state ("See examples" link alongside "Browse templates")
  - A dedicated **"Examples"** entry in the main navigation or toolbar
  - Contextually from individual chart editors ("See this chart type in context →")

#### Example Content Guidelines

- All data is clearly labelled as synthetic — a persistent banner: "Synthetic data — for demonstration only. Not real NHS figures."
- Data is realistic in shape and scale (e.g. A&E attendance volumes consistent with a mid-sized district general hospital) — enough that a clinician recognises the context immediately
- No trust names, staff names, or specific geography in the synthetic data
- Each example includes at least one "interesting" data feature: a run rule violation, a period of improvement, a seasonal pattern — so the user sees the platform responding to real-world patterns, not just flat data

---

### Tutorial System

An embedded, contextual tutorial system that guides users through key workflows without leaving the app. Tutorials are short, focused, and skippable — not a mandatory onboarding flow.

#### Tutorial Types

**1. Quick-start walkthroughs (3–5 steps each)**

Short interactive overlays triggered on first use of a feature area. Each step highlights a UI element and shows a short instruction. The user clicks "Next" to proceed or "Skip" to dismiss.

| Walkthrough | Trigger | Steps |
|---|---|---|
| Upload your first dataset | First click on "Data" button | Upload CSV → rename columns → view preview → close |
| Add your first chart | First click on "Add tile" | Pick chart type → select dataset → map columns → add to dashboard |
| Set up an SPC chart | First SPC tile added | Enter data → set chart kind → understand UCL/LCL → add aim |
| Create a presentation | First click on "Present" | Choose mode → add steps/slides → present |
| Share your dashboard | First "Copy share link" click | Explain share URL → open in new tab → show read-only view |

**2. Feature spotlight cards**

Single-card tooltips that appear the first time a user encounters a significant feature — no click sequence required. Shown once, then permanently dismissed. Examples:
- First time a run rule violation is detected: "Rule detected — this point is outside the control limits. Click it to learn what this means."
- First time an annotation is added: "Annotations mark events on your charts. They're reusable — add them to multiple charts from the Annotations library."
- First time a KPI tile drops below target: "This tile has turned amber because the value is below the target you set. Adjust thresholds in the tile editor."

**3. Help articles (searchable, in-app)**

A lightweight in-app help panel (accessible via a `?` button in the toolbar) containing short articles organised by topic:

- **Getting started**: What is this tool for? / Uploading data / Adding your first chart
- **Chart types**: When to use each chart type / Understanding SPC / Run chart vs SPC
- **NHS context**: Making Data Count methodology / Financial year conventions / Reading funnel plots
- **Data**: CSV formatting tips / Handling missing values / Monthly refresh workflow
- **Sharing**: Share links / Embed code / Snapshot vs share link
- **Presentation**: Story mode vs slide deck / Presenting to a board

Articles are plain text + screenshots. They are bundled in the app (no external CMS dependency) and written in plain English for a non-technical audience. Links between related articles are provided where relevant.

**4. Contextual "Learn more" links**

Every chart editor, panel, and major feature includes a subtle `?` or "Learn more" link that opens the relevant help article directly. These are always optional and never interrupt the user's workflow.

---

### Implementation Notes

#### Client-side only

All tutorial state (which walkthroughs have been seen, which spotlight cards have been dismissed) is stored in `localStorage` under a dedicated key (`spc:tutorials:seen`). No server required.

#### Example data bundling

Example dashboard JSON files are bundled as static assets in `public/examples/`. They are fetched on demand (not pre-loaded). Each file is a standard `DashboardState` JSON with a `isExample: true` flag that prevents accidental save/overwrite.

#### Tutorial overlay architecture

Walkthroughs use a lightweight spotlight overlay: a semi-transparent full-screen backdrop with a circular or rectangular cutout highlighting the target element (positioned via `getBoundingClientRect`). No third-party tour library dependency — implemented in ~150 lines of React.

#### Help panel

The help panel renders as a right-side drawer (same pattern as existing panels). Article content is stored as TypeScript string constants or MDX files. A simple `fuse.js`-based fuzzy search indexes article titles and first paragraphs.

---

### Success Criteria

- A user with no prior training can upload a CSV and create an SPC chart within 5 minutes, guided only by the walkthrough
- A user viewing a shared dashboard link can understand what they are looking at without asking the creator for explanation
- Support requests of the form "how do I…" decline measurably after tutorial system is in place
- Example library is referenced in at least 30% of new user sessions (analytics: accounts phase)

---

### Build Order Placement

These items are lower priority than core charting and sharing features but higher priority than trust admin and collaboration features. Recommended insertion point in the build order after item 44 (Change history log):

- **52. Example library** — static JSON bundles, gallery UI, "use as starting point" copy flow, "What am I looking at?" annotation layer
- **53. Quick-start walkthroughs** — spotlight overlay system, 5 core walkthroughs, localStorage seen-state
- **54. Feature spotlight cards** — contextual single-card tips, dismissable, keyed to specific user actions
- **55. In-app help panel** — searchable article drawer, contextual "Learn more" links from all major feature areas

