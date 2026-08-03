import type { RagRule } from './types';

export type RagStatus = 'green' | 'amber' | 'red';

export function evaluateRag(value: number, rule: RagRule): RagStatus {
  if (rule.higherIsBetter) {
    if (value >= rule.greenThreshold) return 'green';
    if (value >= rule.amberThreshold) return 'amber';
    return 'red';
  } else {
    if (value <= rule.greenThreshold) return 'green';
    if (value <= rule.amberThreshold) return 'amber';
    return 'red';
  }
}

export const RAG_BG: Record<RagStatus, string> = {
  green: 'bg-emerald-50',
  amber: 'bg-amber-50',
  red:   'bg-red-50',
};

export const RAG_BADGE: Record<RagStatus, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-400',
  red:   'bg-red-500',
};

export const RAG_TEXT: Record<RagStatus, string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red:   'text-red-700',
};

export const RAG_LABEL: Record<RagStatus, string> = {
  green: 'Green',
  amber: 'Amber',
  red:   'Red',
};

export function describeRule(rule: RagRule): string {
  const u = rule.unit ? rule.unit : '';
  if (rule.higherIsBetter) {
    return `≥${rule.greenThreshold}${u} = Green · ≥${rule.amberThreshold}${u} = Amber · <${rule.amberThreshold}${u} = Red`;
  } else {
    return `≤${rule.greenThreshold}${u} = Green · ≤${rule.amberThreshold}${u} = Amber · >${rule.amberThreshold}${u} = Red`;
  }
}
