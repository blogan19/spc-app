export interface HelpSection {
  heading?: string;
  body: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  tags: string[];
  summary: string;
  sections: HelpSection[];
}

export const HELP_ARTICLES: HelpArticle[] = [

  {
    id: 'uploading-data',
    title: 'Uploading your data',
    tags: ['data', 'csv', 'upload', 'dataset'],
    summary: 'How to upload a CSV file, what column types are detected, and how your data is stored.',
    sections: [
      {
        heading: 'Supported formats',
        body: 'Click the "Data" button and upload any CSV file. Column types — date, number, and text — are detected automatically from the values in the first 50 rows. You can override the detected type for any column.',
      },
      {
        heading: 'Date formats',
        body: 'Common date formats are recognised automatically: YYYY-MM-DD, DD/MM/YYYY, Month YYYY, Q1 YYYY, and others. If dates are not detected correctly, check that they follow a consistent format throughout the column.',
      },
      {
        heading: 'Your data never leaves the browser',
        body: 'All processing happens locally on your device. Data is not sent to any server. When you save the dashboard as a JSON file or copy a share link, the dataset is included in that file or URL — so recipients can see the charts without needing the original CSV.',
      },
      {
        heading: 'Multiple datasets',
        body: 'You can upload more than one CSV. Each chart is linked to a specific dataset, so you can mix data from different sources on the same dashboard.',
      },
      {
        heading: 'Adding new periods',
        body: 'If a dataset has refresh settings configured (a period column and value columns), a "+ New period" button appears in the toolbar. This lets you add a new row without re-uploading the entire file — useful for monthly reporting.',
      },
    ],
  },

  {
    id: 'chart-types',
    title: 'Choosing a chart type',
    tags: ['chart', 'type', 'bar', 'line', 'spc', 'kpi', 'run', 'pareto', 'scatter', 'heatmap', 'pie', 'funnel'],
    summary: 'A quick guide to each chart type and when to use it.',
    sections: [
      {
        heading: 'SPC (Statistical Process Control)',
        body: 'Use an SPC chart when you want to understand whether variation in a measure over time is normal (random noise) or a genuine signal worth acting on. Requires a date column and a numeric value column. Best for operational metrics tracked monthly or weekly.',
      },
      {
        heading: 'Run chart',
        body: 'A simpler alternative to an SPC chart with no control limits — just a line with a median. Use when you have too few data points for reliable SPC limits (fewer than ~12), or when you just want to show trends without statistical context.',
      },
      {
        heading: 'Bar chart',
        body: 'Compare values across categories or over time. Best for discrete comparisons — e.g. activity by ward, by month, or by team.',
      },
      {
        heading: 'Line chart',
        body: 'Show trends over time for one or more series. Unlike SPC, a line chart does not calculate control limits or detect signals — it is purely visual. Good for showing multiple measures together.',
      },
      {
        heading: 'KPI tile',
        body: 'Display a single headline number prominently. Supports a comparison value (target or previous period), RAG status colouring, and a spark trend. Link a KPI to a metric in the metric library to keep it in sync.',
      },
      {
        heading: 'Pareto chart',
        body: 'A bar chart sorted descending with a cumulative percentage line. Used to identify the small number of causes responsible for the majority of a problem (the 80/20 rule). Requires a category column and a numeric value column.',
      },
      {
        heading: 'Funnel chart',
        body: 'Compare rates across different sites or groups (e.g. referral rates by trust). Uses Poisson-based control limits to show which sites are statistically different from the average. Requires a numerator, denominator, and a unit/label column.',
      },
      {
        heading: 'Scatter plot',
        body: 'Show the relationship between two numeric variables. Useful for spotting correlations. Each row in your dataset becomes a dot.',
      },
      {
        heading: 'Heatmap',
        body: 'Show a matrix of values where colour intensity represents magnitude. Good for patterns across two categorical dimensions — e.g. activity by day of week and hour of day.',
      },
      {
        heading: 'Pie / donut chart',
        body: 'Show part-to-whole proportions across a small number of categories (ideally fewer than 6). Use sparingly — bar charts are usually easier to read for comparisons.',
      },
      {
        heading: 'Other types',
        body: 'Area charts, waterfall charts, box plots, population pyramids, calendar heatmaps, Gantt charts, and data tables are also available. Use the "Help me choose" wizard in the Add Tile dialog for a guided recommendation.',
      },
    ],
  },

  {
    id: 'spc-charts',
    title: 'Reading an SPC chart',
    tags: ['spc', 'control', 'limits', 'ucl', 'lcl', 'signals', 'variation', 'xmr', 'statistical'],
    summary: 'What the lines mean, how signals are detected, and when to recalculate.',
    sections: [
      {
        heading: 'What SPC shows',
        body: 'Statistical Process Control (SPC) charts plot a measure over time and overlay statistically-derived control limits. Points that fall within the limits, and follow no unusual patterns, indicate that variation is normal — the process is stable. Points or patterns outside this expected range are signals: they suggest the process has genuinely changed and may warrant investigation.',
      },
      {
        heading: 'The centre line',
        body: 'The solid centre line is the mean (average) for the current phase. Each time you mark a recalculation point, a new centre line is calculated for the new phase.',
      },
      {
        heading: 'Control limits (UCL and LCL)',
        body: 'The upper control limit (UCL) and lower control limit (LCL) are set at ±3 sigma from the mean, calculated using the average moving range. They are not target lines — they describe the range of normal variation for the current process. Approximately 99.7% of points from a stable process should fall between them.',
      },
      {
        heading: 'The four signal rules',
        body: 'The NHS "Making Data Count" guidance uses four rules to detect signals: (1) a single point outside the control limits; (2) seven or more consecutive points on the same side of the centre line; (3) seven or more consecutive points all trending in the same direction; (4) two out of three consecutive points in the outer third of the chart (between 2-sigma and 3-sigma). When any rule fires, the point is highlighted with a filled circle.',
      },
      {
        heading: 'Recalculating after an intervention',
        body: 'If you make a significant change to the process — a new policy, a redesign, a new team — tick "Recalculate from here" on the first data point after the change. The centre line and limits are recalculated for the new phase. This is how you demonstrate that an improvement has been sustained: the new limits reflect the new process, not the old one.',
      },
    ],
  },

  {
    id: 'kpi-tiles',
    title: 'KPI tiles',
    tags: ['kpi', 'metric', 'target', 'rag', 'comparison', 'headline'],
    summary: 'How to configure a KPI tile, set targets, and link to a metric.',
    sections: [
      {
        heading: 'Basic setup',
        body: 'A KPI tile shows a single number prominently — a count, a rate, a percentage, or any numeric value. Set the label, value, and optionally a unit. The value can be typed in directly or calculated from a dataset column (e.g. the latest row\'s value, the sum, or the average).',
      },
      {
        heading: 'Comparison value',
        body: 'Add a comparison value and label (e.g. "Target: 95%" or "Last month: 87%"). The tile shows the difference and colours it green, amber, or red based on whether higher or lower is better.',
      },
      {
        heading: 'RAG colouring',
        body: 'For more precise thresholds, link the tile to a RAG rule. RAG rules let you define red/amber/green bands once (e.g. <80% = red, 80–90% = amber, ≥90% = green) and reuse them across multiple KPI tiles. Create rules in the ••• menu under "RAG rules".',
      },
      {
        heading: 'Linking to the metric library',
        body: 'If you have a metric defined in the metric library (••• menu → Metrics), you can link the KPI tile to it. The tile\'s label, unit, and target value then stay in sync with the metric definition — update the metric once and all tiles that reference it update automatically.',
      },
      {
        heading: 'Spark trend',
        body: 'Link the KPI tile to a dataset column and it will show a small spark line below the headline number, giving viewers a sense of the recent trend without needing to open a full chart.',
      },
    ],
  },

  {
    id: 'rag-rules',
    title: 'RAG rules',
    tags: ['rag', 'red', 'amber', 'green', 'threshold', 'rules', 'kpi'],
    summary: 'Define red/amber/green thresholds once and reuse them across all KPI tiles.',
    sections: [
      {
        heading: 'What RAG rules are for',
        body: 'RAG rules let you define the boundaries between red, amber, and green status for a metric — once. Instead of configuring thresholds separately for every KPI tile, you define a rule (e.g. "Referral to Treatment: <80% = red, 80–92% = amber, ≥92% = green") and link multiple tiles to it.',
      },
      {
        heading: 'Creating a rule',
        body: 'Open the ••• menu and choose "RAG rules". Click "+ Add rule", give it a name, choose whether higher or lower values are better, and set the thresholds. Rules can be applied to any KPI tile via the tile editor.',
      },
      {
        heading: 'Direction',
        body: 'Set "Higher is better" for measures like referral-to-treatment compliance or patient satisfaction, and "Lower is better" for measures like wait times or complication rates. The RAG bands flip accordingly.',
      },
    ],
  },

  {
    id: 'sharing',
    title: 'Sharing and embedding',
    tags: ['share', 'link', 'url', 'embed', 'iframe', 'sharepoint', 'read-only'],
    summary: 'How share links work, what gets included, and how to embed the dashboard.',
    sections: [
      {
        heading: 'Share links',
        body: 'Open the ••• menu and choose "Copy share link". The entire dashboard — layout, charts, and data — is compressed into the URL. Anyone with the link can open it in a browser in read-only mode. No account or login is needed.',
      },
      {
        heading: 'Large dashboards',
        body: 'If your dashboard has many data rows, the compressed URL may exceed browser limits (~2 MB). In that case, dataset rows are automatically stripped from the share link — recipients see the dashboard layout but charts show no data. The warning message tells you when this happens. To share large dashboards with data, save and send the JSON file instead.',
      },
      {
        heading: 'Read-only mode',
        body: 'Recipients viewing a shared link see the dashboard in read-only mode. They can view all tiles, hover for tooltips, and use any interactive features (filters, drill-through), but they cannot edit tiles, change the layout, or modify data.',
      },
      {
        heading: 'Embed code',
        body: 'Open the ••• menu and choose "Get embed code". This generates an iframe snippet you can paste into SharePoint, a website, or any platform that supports HTML embeds. You can choose from preset sizes or enter a custom width and height.',
      },
      {
        heading: 'Saving as a file',
        body: 'Click "Save" in the toolbar to download the dashboard as a .json file. This file contains everything — layout, charts, and all data. You can share it by email or file system; recipients load it with "Load file…" in the ••• menu.',
      },
    ],
  },

  {
    id: 'presenting',
    title: 'Presenting your dashboard',
    tags: ['present', 'story', 'slide', 'deck', 'presentation', 'mode', 'keyboard'],
    summary: 'Story mode and slide deck mode — how they work and when to use each.',
    sections: [
      {
        heading: 'Two presentation modes',
        body: 'Click "Present" in the toolbar to choose between Dashboard Story and Slide Deck. Story mode works with the live dashboard. Slide Deck is a separate canvas where you build standalone slides.',
      },
      {
        heading: 'Dashboard Story',
        body: 'Story mode guides your audience through tiles one at a time. Each step focuses on one tile and dims the rest. You can add commentary text for each step that appears alongside the chart. Ideal for committee meetings where you are walking the room through live data.',
      },
      {
        heading: 'Slide Deck',
        body: 'Slide deck mode is a separate PowerPoint-style canvas. You create slides and place chart tiles or text elements on them. Charts are pulled from the dashboard — so they always reflect the current data. Good for standalone reports or presentations that need a specific layout.',
      },
      {
        heading: 'Keyboard shortcuts',
        body: 'In both modes: left and right arrow keys (or Page Up / Page Down) move between steps or slides. Press N to toggle speaker notes. Press Escape to exit the presentation. Presenter clicker left/right buttons work too.',
      },
    ],
  },

  {
    id: 'annotations',
    title: 'Annotations',
    tags: ['annotation', 'event', 'marker', 'intervention', 'date'],
    summary: 'Mark important dates — policy changes, incidents, interventions — that appear across charts.',
    sections: [
      {
        heading: 'What annotations do',
        body: 'Annotations mark specific dates with a label — for example, "New pathway launched" or "Bank holiday". They appear as vertical marker lines on charts that include those dates, giving viewers context for any changes visible in the data.',
      },
      {
        heading: 'Creating annotations',
        body: 'Open the ••• menu and choose "Annotations". Click "+ Add annotation", enter the date and a short label. You can optionally add a longer description that appears on hover.',
      },
      {
        heading: 'Which charts show annotations',
        body: 'Annotations appear automatically on any line chart or SPC/run chart whose date range includes the annotation date. You can turn them off for individual charts in the chart editor.',
      },
    ],
  },

  {
    id: 'snapshots',
    title: 'Snapshots',
    tags: ['snapshot', 'history', 'archive', 'point-in-time', 'compare'],
    summary: 'Capture the dashboard at a moment in time and compare with later versions.',
    sections: [
      {
        heading: 'What snapshots do',
        body: 'A snapshot saves a complete copy of the dashboard as it looks right now — layout, data, and all. Useful for end-of-month reporting, version tracking, or creating a "before and after" comparison.',
      },
      {
        heading: 'Taking a snapshot',
        body: 'Open the ••• menu and choose "Take snapshot". Give it a name (a date is pre-filled) and optional notes. The snapshot is stored in your current browser session.',
      },
      {
        heading: 'Viewing snapshot history',
        body: 'If you have taken at least one snapshot, "Snapshot history" appears in the ••• menu. This shows all snapshots in the current session. You can download any snapshot as a JSON file to keep a permanent record.',
      },
      {
        heading: 'Snapshots are session-only',
        body: 'Snapshots are stored in memory for the current browser session only — they are not saved to localStorage. To keep them permanently, download each snapshot as a JSON file using the history panel.',
      },
    ],
  },

  {
    id: 'templates-examples',
    title: 'Templates and examples',
    tags: ['template', 'example', 'synthetic', 'starting point', 'blank', 'gallery'],
    summary: 'The difference between templates (blank layouts) and examples (fully built with synthetic data).',
    sections: [
      {
        heading: 'Templates',
        body: 'Templates are blank dashboard layouts pre-configured with chart types and tile positions. They contain no data — just the structure. Load a template, then upload your own CSV to populate the charts. Good for standard NHS reporting dashboards where you want a consistent layout.',
      },
      {
        heading: 'Examples',
        body: 'Examples are fully built dashboards with realistic but fictional NHS data. They let you explore what the platform can produce before committing to your own data. Click "Use as starting point" to copy an example and replace the synthetic data with your own.',
      },
      {
        heading: 'The guide panel',
        body: 'When viewing an example, the "What am I looking at?" guide panel on the right explains each chart — what it shows, what the signals mean, and what questions it is designed to answer. This panel is hidden in the copied version so it does not appear in your final dashboard.',
      },
    ],
  },

];
