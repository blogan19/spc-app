import type { ColumnDef, TileKind } from './types';

export interface ChartSuggestion {
  kind: TileKind;
  title: string;
  reason: string;
  icon: string;
}

export function suggestChartType(columns: ColumnDef[]): ChartSuggestion | null {
  const eff = (c: ColumnDef) => c.typeOverride ?? c.type;
  const dates = columns.filter((c) => eff(c) === 'date');
  const nums = columns.filter((c) => eff(c) === 'numeric');
  const texts = columns.filter((c) => eff(c) === 'text');

  const nd = dates.length, nn = nums.length, nt = texts.length;

  // 1 date + 2+ numeric → multi-series line
  if (nd === 1 && nn >= 2) {
    return {
      kind: 'line', title: 'Line Chart', icon: '〰️',
      reason: `One date column + ${nn} numeric columns — a multi-series line chart lets you compare all ${nn} measures over time on a shared axis.`,
    };
  }

  // 1 date + 1 numeric → run chart (most common time-series use case)
  if (nd === 1 && nn === 1) {
    return {
      kind: 'run', title: 'Run Chart', icon: '📉',
      reason: 'One date column + one numeric measure — a run chart plots the trend over time with a median line and automatically highlights shifts and trends.',
    };
  }

  // 1 text + 1 date + 1 numeric → heatmap (e.g. ward × month)
  if (nt === 1 && nd === 1 && nn === 1) {
    return {
      kind: 'heatmap', title: 'Heatmap', icon: '🌡️',
      reason: `One category column (${texts[0].name}), one date column, and one numeric — a heatmap shows intensity across two dimensions, e.g. ${texts[0].name} by month.`,
    };
  }

  // 2 numeric, no dates → scatter
  if (nd === 0 && nn === 2 && nt <= 1) {
    return {
      kind: 'scatter', title: 'Scatter Plot', icon: '⚬',
      reason: `Two numeric columns (${nums[0].name} and ${nums[1].name}) with no time axis — a scatter plot reveals whether they're correlated.`,
    };
  }

  // 1 text + 2+ numeric (no date) → grouped bar
  if (nt === 1 && nn >= 2 && nd === 0) {
    return {
      kind: 'bar', title: 'Bar Chart', icon: '📊',
      reason: `One category column + ${nn} numeric columns — a grouped bar chart compares each measure side by side per category.`,
    };
  }

  // 1 text + 1 numeric (no date) → bar
  if (nt === 1 && nn === 1 && nd === 0) {
    return {
      kind: 'bar', title: 'Bar Chart', icon: '📊',
      reason: `One category column (${texts[0].name}) + one numeric (${nums[0].name}) — a bar chart is the clearest way to compare values across categories.`,
    };
  }

  // text-only dataset → pareto (count occurrences)
  if (nt >= 1 && nn === 0 && nd === 0) {
    return {
      kind: 'pareto', title: 'Pareto Chart', icon: '🔢',
      reason: `Category labels with no pre-counted values — a Pareto chart counts occurrences of each category and ranks them to highlight the vital few that cause most of the problem.`,
    };
  }

  // 1 text + multiple numerics → box plot (distribution by group)
  if (nt === 1 && nn >= 3 && nd === 0) {
    return {
      kind: 'boxplot', title: 'Box Plot', icon: '📦',
      reason: `One group column + several numeric values — a box plot shows the distribution (median, spread, outliers) for each group.`,
    };
  }

  return null;
}
