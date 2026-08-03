'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { HeatmapColorScheme } from '@/lib/dashboard/types';

export interface CalendarDay {
  date: string;   // YYYY-MM-DD
  value: number;
}

interface DashCalendarHeatmapProps {
  data: CalendarDay[];
  year: number;
  colorScheme?: HeatmapColorScheme;
  width: number;
  height: number;
}

const SCHEME_COLORS: Record<HeatmapColorScheme, string[]> = {
  'sequential-blue':   ['#ebedf0', '#c6e0f5', '#85c1e9', '#3498db', '#1a5276'],
  'sequential-green':  ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  'sequential-orange': ['#ebedf0', '#fde3c8', '#f5a742', '#e07b00', '#8a4d00'],
  'diverging':         ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

export default function DashCalendarHeatmap({
  data,
  year,
  colorScheme = 'sequential-green',
  width,
  height,
}: DashCalendarHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();
    if (width < 100 || height < 60) return;

    const marginTop = 24;   // month labels
    const marginLeft = 28;  // day-of-week labels
    const marginBottom = 8;
    const marginRight = 8;

    const innerW = width - marginLeft - marginRight;
    const innerH = height - marginTop - marginBottom;

    // Jan 1 of the given year
    const jan1 = new Date(year, 0, 1);
    // First Monday on or before Jan 1
    const startDow = jan1.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const offsetToMon = startDow === 0 ? -6 : 1 - startDow;
    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() + offsetToMon);

    // Build 53 weeks × 7 days
    const NUM_WEEKS = 53;
    const cellGap = 2;
    const cellSize = Math.max(4, Math.floor((innerW - cellGap * (NUM_WEEKS - 1)) / NUM_WEEKS));
    const rowH = Math.max(4, Math.floor((innerH - cellGap * 6) / 7));
    const cs = Math.min(cellSize, rowH);

    // Value lookup by date string
    const valueMap = new Map<string, number>(data.map((d) => [d.date, d.value]));
    const maxVal = d3.max(data, (d) => d.value) ?? 1;
    const colors = SCHEME_COLORS[colorScheme];
    const colorScale = d3.scaleQuantize<string>()
      .domain([0, maxVal])
      .range(colors.slice(1)); // 4 levels for actual data

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${marginLeft},${marginTop})`);

    // Build grid
    const cells: { week: number; dow: number; date: Date; dateStr: string; inYear: boolean }[] = [];
    for (let w = 0; w < NUM_WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const cur = new Date(gridStart);
        cur.setDate(cur.getDate() + w * 7 + d);
        const dateStr = cur.toISOString().slice(0, 10);
        cells.push({ week: w, dow: d, date: cur, dateStr, inYear: cur.getFullYear() === year });
      }
    }

    // Draw cells
    const tooltip = d3.select('body').append('div')
      .attr('class', 'cal-tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', 'rgba(15,23,42,0.9)')
      .style('color', '#fff')
      .style('padding', '5px 8px')
      .style('border-radius', '6px')
      .style('font-size', '11px')
      .style('opacity', 0)
      .style('z-index', 9999)
      .style('white-space', 'nowrap');

    g.selectAll('rect.cell')
      .data(cells)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (c) => c.week * (cs + cellGap))
      .attr('y', (c) => c.dow * (cs + cellGap))
      .attr('width', cs)
      .attr('height', cs)
      .attr('rx', Math.max(1, cs * 0.15))
      .attr('fill', (c) => {
        if (!c.inYear) return '#f3f4f6';
        const v = valueMap.get(c.dateStr);
        return v != null && v > 0 ? colorScale(v) : colors[0];
      })
      .on('mousemove', (event, c) => {
        const v = valueMap.get(c.dateStr);
        const label = c.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        tooltip
          .style('opacity', 1)
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 28}px`)
          .text(v != null ? `${label}: ${v.toLocaleString()}` : `${label}: no data`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0));

    // Day-of-week labels (Mon, Wed, Fri)
    const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    [0, 2, 4, 6].forEach((i) => {
      g.append('text')
        .attr('x', -4)
        .attr('y', i * (cs + cellGap) + cs * 0.75)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(8, cs * 0.7))
        .attr('fill', '#9ca3af')
        .text(DOW_LABELS[i].slice(0, 1));
    });

    // Month labels — at start of each month
    const seen = new Set<string>();
    cells.filter((c) => c.dow === 0 && c.inYear).forEach((c) => {
      const month = `${c.date.getFullYear()}-${c.date.getMonth()}`;
      if (seen.has(month)) return;
      seen.add(month);
      const monthLabel = c.date.toLocaleDateString('en-GB', { month: 'short' });
      g.append('text')
        .attr('x', c.week * (cs + cellGap))
        .attr('y', -6)
        .attr('font-size', Math.max(8, cs * 0.7))
        .attr('fill', '#6b7280')
        .text(monthLabel);
    });

    return () => { tooltip.remove(); };
  }, [data, year, colorScheme, width, height]);

  return <svg ref={svgRef} />;
}
