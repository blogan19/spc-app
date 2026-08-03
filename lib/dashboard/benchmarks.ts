export interface ReferenceLine {
  id: string;         // uuid so list items have stable keys
  value: number;
  label: string;
  source: string;     // displayed in chart tooltip / citation
  color: string;
}

export interface NhsBenchmark {
  id: string;
  name: string;
  value: number;
  unit: string;
  description: string;
  source: string;
  color: string;
}

export const NHS_BENCHMARKS: NhsBenchmark[] = [
  {
    id: 'ae_4hr_95',
    name: 'A&E 4-hour standard',
    value: 95,
    unit: '%',
    description: '95% of A&E patients seen within 4 hours — NHS England operational standard',
    source: 'NHS England',
    color: '#003087',
  },
  {
    id: 'rtt_18wk_92',
    name: 'RTT 18-week standard',
    value: 92,
    unit: '%',
    description: '92% of patients on an incomplete RTT pathway waiting less than 18 weeks',
    source: 'NHS England',
    color: '#007f3b',
  },
  {
    id: 'cancer_62d_85',
    name: 'Cancer 62-day standard',
    value: 85,
    unit: '%',
    description: '85% of patients to receive first definitive treatment within 62 days of urgent referral',
    source: 'NHS England',
    color: '#d5281b',
  },
  {
    id: 'cancer_31d_96',
    name: 'Cancer 31-day standard',
    value: 96,
    unit: '%',
    description: '96% of patients to receive first definitive treatment within 31 days of decision to treat',
    source: 'NHS England',
    color: '#d5281b',
  },
  {
    id: 'cancer_2ww_93',
    name: 'Cancer 2-week wait',
    value: 93,
    unit: '%',
    description: '93% of patients urgently referred for suspected cancer seen within 2 weeks',
    source: 'NHS England',
    color: '#f47738',
  },
  {
    id: 'mandatory_training_85',
    name: 'Mandatory training (85%)',
    value: 85,
    unit: '%',
    description: 'Common NHS Trust target for mandatory training compliance',
    source: 'Trust standard (indicative)',
    color: '#768692',
  },
  {
    id: 'sickness_absence_3_5',
    name: 'Sickness absence (3.5%)',
    value: 3.5,
    unit: '%',
    description: 'NHS England indicative target for staff sickness absence rate',
    source: 'NHS England (indicative)',
    color: '#f47738',
  },
  {
    id: 'zero_line',
    name: 'Zero line',
    value: 0,
    unit: '',
    description: 'Reference line at zero — useful for variance/surplus/deficit charts',
    source: 'Custom',
    color: '#6b7280',
  },
];
