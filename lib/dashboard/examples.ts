import { TEMPLATES } from './templates';
import type { DashboardState } from './types';

export interface ExampleGuideItem {
  chartName: string;   // matches ChartConfig.name exactly
  title: string;
  body: string;
}

export interface ExampleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  chartTypes: string[];   // human-readable chart type labels shown in the gallery
  learningGoal: string;
  guide: ExampleGuideItem[];
  build: () => DashboardState;
}

const ae   = TEMPLATES.find((t) => t.id === 'ae')!;
const qi   = TEMPLATES.find((t) => t.id === 'qi')!;
const rtt  = TEMPLATES.find((t) => t.id === 'rtt')!;
const wf   = TEMPLATES.find((t) => t.id === 'workforce')!;
const inf  = TEMPLATES.find((t) => t.id === 'infection')!;
const op   = TEMPLATES.find((t) => t.id === 'outpatient')!;
const bed  = TEMPLATES.find((t) => t.id === 'bed-occupancy')!;

export const EXAMPLES: ExampleDef[] = [
  {
    id: 'ae',
    name: 'A&E Performance',
    description: 'Emergency department 4-hour standard tracking with demand context. Shows a winter performance dip caused by rising attendances.',
    icon: '🚑',
    tags: ['A&E', 'Urgent care', 'Waiting times'],
    chartTypes: ['KPI tile', 'Line chart', 'Bar chart', 'Reference line'],
    learningGoal: 'How a KPI tile, a trend line, and a demand bar chart together tell a performance story — and why demand context matters.',
    build: ae.build,
    guide: [
      {
        chartName: 'Latest 4-hour %',
        title: 'KPI tile — current performance at a glance',
        body: 'Shows the most recent month\'s 4-hour performance (82.3%) alongside the 95% national standard. The red arrow means performance is below target. KPI tiles work best at the top of a dashboard so the headline figure is immediately visible without scrolling.',
      },
      {
        chartName: 'A&E 4-hour standard over time',
        title: 'Line chart — trend with a reference line',
        body: 'Tracks 4-hour performance over 12 months. The red dashed reference line marks the 95% NHS England standard. The dip in December–January is seasonal, driven by higher attendances rather than a process failure. Always check the demand chart before drawing conclusions from a performance line.',
      },
      {
        chartName: 'Monthly attendances',
        title: 'Bar chart — why the dip happened',
        body: 'Placing the attendance bar chart directly below the performance line makes the cause-and-effect relationship visible: higher bars in winter correspond directly to the performance dip above. Without this context a reader could wrongly conclude something changed in the process.',
      },
      {
        chartName: 'Commentary',
        title: 'Text tile — the narrative',
        body: 'Data alone rarely tells the full story. A text tile lets you add the written interpretation — what the data shows, what is driving the pattern, and what action is being taken. For board reporting this is essential.',
      },
    ],
  },
  {
    id: 'qi',
    name: 'Quality Improvement (SPC)',
    description: 'SPC chart showing a proven improvement following a PDSA intervention — 30-day readmissions shifted after a new discharge bundle.',
    icon: '📈',
    tags: ['SPC', 'QI', 'PDSA', 'Patient safety'],
    chartTypes: ['SPC / XmR chart', 'Bar chart', 'Annotation'],
    learningGoal: 'How an XmR control chart distinguishes genuine improvement from random variation — the foundation of "making data count".',
    build: qi.build,
    guide: [
      {
        chartName: '30-day readmissions (SPC)',
        title: 'SPC chart — detecting real change',
        body: 'This XmR control chart calculates upper and lower control limits (UCL/LCL) from the data. Points inside the limits are normal variation. In July 2024, a discharge bundle was introduced (marked by the vertical annotation). The centre line recalculates from that point — indicating the process genuinely changed, not just random fluctuation. This is what statistical evidence of improvement looks like.',
      },
      {
        chartName: 'Falls rate',
        title: 'Bar chart — a second improvement metric',
        body: 'Falls per 1,000 bed days also reduced from Q3 2024 onwards, suggesting the same QI work had broader patient safety benefits. Bar charts work well for count or rate data where you want to see each period discretely.',
      },
      {
        chartName: 'Improvement commentary',
        title: 'Text tile — documenting the intervention',
        body: 'For QI dashboards, documenting what was done and when is as important as the data. Anyone reviewing this dashboard in 6 months should be able to understand the intervention without having to contact the author.',
      },
    ],
  },
  {
    id: 'outpatient',
    name: 'Outpatient DNA',
    description: 'Did Not Attend rates with a stacked area chart showing appointment outcomes, and a Pareto chart ranking the top reasons patients did not attend.',
    icon: '📅',
    tags: ['Outpatients', 'DNA', 'Pareto', 'Demand'],
    chartTypes: ['KPI tile', 'Stacked area chart', 'Pareto chart'],
    learningGoal: 'How a Pareto chart focuses improvement effort on the highest-impact DNA causes, and how a stacked area chart shows appointment capacity at a glance.',
    build: op.build,
    guide: [
      {
        chartName: 'DNA rate (latest month)',
        title: 'KPI tile — the headline metric',
        body: 'At 11.6% against an 8% trust target the DNA rate is materially above standard. The comparison arrow and direction make the gap immediately visible without needing to read the chart.',
      },
      {
        chartName: 'Appointments: attended vs DNA',
        title: 'Stacked area chart — capacity at a glance',
        body: 'The stacked area chart shows the full appointment capacity split between attended (green) and did not attend (red). Stacking is useful here because the two series add up to a meaningful total — capacity. The December dip reflects seasonal capacity reduction rather than a DNA spike.',
      },
      {
        chartName: 'Top reasons for DNA',
        title: 'Pareto chart — where to focus first',
        body: '"Not received appointment letter" and "forgot / no reminder" together account for over half of all DNAs. A Pareto chart applies the 80/20 principle — fix the top two causes and you address the majority of the problem. The cumulative % line makes this visible at a glance. This is more actionable than a bar chart showing all reasons with equal weight.',
      },
      {
        chartName: 'DNA commentary',
        title: 'Text tile — the improvement hypothesis',
        body: 'The commentary translates the Pareto finding into an action: a letter/SMS reminder system addresses the top cause without changing any clinical process. This is how you move from data to decision.',
      },
    ],
  },
  {
    id: 'bed-occupancy',
    name: 'Bed Occupancy',
    description: 'Trust-wide occupancy trend against the 92% NHS guidance threshold, with a ward-by-month heatmap to pinpoint where pressure is highest.',
    icon: '🏥',
    tags: ['Beds', 'Capacity', 'Heatmap', 'Winter pressure'],
    chartTypes: ['KPI tile', 'Area chart', 'Heatmap'],
    learningGoal: 'How a heatmap reveals ward-level patterns invisible in a trust aggregate, and why occupancy context matters for patient safety.',
    build: bed.build,
    guide: [
      {
        chartName: 'Overall occupancy (latest)',
        title: 'KPI tile — above the safe threshold',
        body: 'At 94.6% against the 92% NHS guidance threshold, occupancy is above the level where the system can absorb emergency demand spikes. The comparison direction shows the trust is higher than guidance, not lower — important for patient flow and infection risk.',
      },
      {
        chartName: 'Occupied vs available beds',
        title: 'Area chart — the gap is shrinking',
        body: 'The two area series (occupied and available) show how the gap between them narrows in winter. An area chart works well here because the gap between two series has direct meaning — it represents unoccupied beds, the system\'s resilience. When the gap closes to near zero in January, the system has almost no buffer.',
      },
      {
        chartName: 'Ward occupancy by month',
        title: 'Heatmap — where pressure is worst',
        body: 'The heatmap shows 5 wards × 12 months in a single view. Dark blue cells flag the highest-occupied combinations. Ward D (Medical) and Ward E (Care of Elderly) are dark across winter — the trust aggregate masks this. A heatmap is the most efficient way to compare multiple categories across time when you need to spot patterns rather than read exact values.',
      },
      {
        chartName: 'Bed management commentary',
        title: 'Text tile — linking data to action',
        body: 'The commentary names the wards with the highest sustained pressure and connects occupancy to concrete risk: limited resilience to emergency admissions. This moves the dashboard from observation to action.',
      },
    ],
  },
  {
    id: 'rtt',
    name: 'Referral to Treatment',
    description: 'Elective waiting list performance — incomplete pathways, 18-week standard, and long waiters. Reflects a trust significantly below the 92% national standard.',
    icon: '📋',
    tags: ['RTT', 'Elective', 'Waiting times'],
    chartTypes: ['KPI tile', 'Line chart', 'Bar chart', 'Reference line'],
    learningGoal: 'How to show both the percentage standard and the waiting list volume together — because you cannot improve the standard without understanding why the list is growing.',
    build: rtt.build,
    guide: [
      {
        chartName: '18-week standard (latest)',
        title: 'KPI tile — the standard gap',
        body: 'At 74.1% against the 92% national standard there is an 18 percentage point gap. Most NHS trusts are below 92% — this example reflects that reality. The comparison value and direction arrow communicate the gap immediately.',
      },
      {
        chartName: '52-week waiters (latest)',
        title: 'KPI tile — long waiters',
        body: 'The comparison here is the previous month\'s figure rather than a target. The downward arrow means long waiters reduced month-on-month — a positive direction-of-travel even if the total remains high. Direction-of-travel comparison is useful when no single target exists.',
      },
      {
        chartName: 'RTT 18-week standard trend',
        title: 'Line chart — a flat trajectory',
        body: 'The 12-month trend shows performance hovering at 73–75% with no clear improvement. The red reference line at 92% shows how far the trust needs to travel. A flat trend at this level means the waiting list is not being reduced — further investigation into throughput vs demand is needed.',
      },
      {
        chartName: 'Total incomplete pathways',
        title: 'Bar chart — the list is growing',
        body: 'Growing bars month-on-month explain why the 18-week standard is not improving: more patients are waiting than are being treated. Showing both the standard (line chart) and the volume (bar chart) gives a complete picture of why performance is where it is.',
      },
    ],
  },
  {
    id: 'workforce',
    name: 'Workforce',
    description: 'Sickness absence, vacancy rate, and mandatory training compliance over a financial year — each shown against NHS or trust targets.',
    icon: '👥',
    tags: ['Workforce', 'HR', 'Staffing'],
    chartTypes: ['KPI tile', 'Multi-series line chart', 'Bar chart', 'Reference line'],
    learningGoal: 'How to display multiple workforce metrics with different targets, and why sickness and vacancy rate belong on the same chart.',
    build: wf.build,
    guide: [
      {
        chartName: 'Sickness absence (latest)',
        title: 'KPI tile — above target',
        body: 'At 5.1% against a 3.5% NHS target, sickness is 1.6 percentage points above standard. "Higher is worse" so the direction arrow correctly flags the gap. KPI tiles work best for single-number metrics with a clear target.',
      },
      {
        chartName: 'Mandatory training (latest)',
        title: 'KPI tile — narrowly below target',
        body: 'At 84%, mandatory training is 1 percentage point below the 85% trust target. The amber state reflects a small but real gap. Placing related KPI tiles side-by-side lets the reader compare multiple metrics without switching charts.',
      },
      {
        chartName: 'Sickness & Vacancy trends',
        title: 'Multi-series line — related metrics together',
        body: 'Sickness and vacancy are shown on the same chart because they are causally linked — high vacancies increase pressure on existing staff, driving sickness. The multi-series line reveals this relationship over time. The green reference line marks the 3.5% sickness target. Putting both series on one axis works because they share the same unit (%).',
      },
      {
        chartName: 'Mandatory training compliance',
        title: 'Bar chart — month-by-month compliance',
        body: 'The green reference line at 85% makes it immediately clear which months were above or below target. Bar charts suit compliance metrics where you want each period to read distinctly rather than as a continuous trajectory.',
      },
    ],
  },
  {
    id: 'infection',
    name: 'Infection Prevention',
    description: 'C. difficile, MRSA, and gram-negative bloodstream infections over 12 months — demonstrating zero-tolerance reporting and multi-series trend tracking.',
    icon: '🦠',
    tags: ['IPC', 'Infection', 'Patient safety', 'Zero tolerance'],
    chartTypes: ['KPI tile', 'Bar chart', 'Multi-series line chart'],
    learningGoal: 'How to present infection data that carries zero-tolerance requirements alongside trend context to distinguish seasonal variation from a genuine signal.',
    build: inf.build,
    guide: [
      {
        chartName: 'MRSA (year to date)',
        title: 'KPI tile — year-to-date count',
        body: 'For infection metrics with zero-tolerance requirements, a cumulative YTD count is more meaningful than a monthly figure. Any value above zero warrants investigation, which is why there is no "green" threshold here.',
      },
      {
        chartName: 'C. diff cases',
        title: 'Bar chart — monthly cases with zero-tolerance line',
        body: 'The green reference line at zero marks the zero-tolerance standard. The winter spike (December–January) is clearly visible as a bar chart lets you read each month independently. For patient safety metrics this matters — you need to see outlying months, not just a smoothed trend.',
      },
      {
        chartName: 'Infection trend',
        title: 'Multi-series line — two infection types together',
        body: 'C. difficile and gram-negative BSI (GNBSI) are placed on one chart because both rise in winter. A shared chart makes the co-movement visible — suggesting a shared environmental or seasonal driver rather than a pathogen-specific cause. This guides investigation.',
      },
    ],
  },
];
