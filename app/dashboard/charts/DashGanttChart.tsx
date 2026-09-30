'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface GanttTask {
  label: string;
  start: Date;
  end: Date;
  category: string;
}

interface DashGanttChartProps {
  tasks: GanttTask[];
  categories: string[];
  title: string;
  showToday: boolean;
  colors: string[];
  width: number;
  height: number;
  fontFamily: string;
}

export default function DashGanttChart({
  tasks,
  categories,
  title,
  showToday,
  colors,
  width,
  height,
  fontFamily,
}: DashGanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (tasks.length === 0) return;

    const hasCategories = categories.length > 0;
    const legendH = hasCategories ? 22 : 0;

    const mt = title ? 36 : 12;
    const mb = 36 + legendH;
    const ml = Math.min(160, Math.max(80, d3.max(tasks, (t) => t.label.length)! * 6.5));
    const mr = 16;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);
    if (innerW < 40 || innerH < 20) return;

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial');

    if (title) {
      svg
        .append('text')
        .attr('x', ml + innerW / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', '600')
        .attr('fill', '#111827')
        .text(title);
    }

    const g = svg.append('g').attr('transform', `translate(${ml},${mt})`);

    // Scales
    const allDates = tasks.flatMap((t) => [t.start, t.end]);
    const [minDate, maxDate] = d3.extent(allDates) as [Date, Date];
    const span = maxDate.getTime() - minDate.getTime();
    const pad = Math.max(span * 0.03, 86400000); // at least 1-day padding
    const xDomain: [Date, Date] = [new Date(minDate.getTime() - pad), new Date(maxDate.getTime() + pad)];

    const x = d3.scaleTime().domain(xDomain).range([0, innerW]);

    const taskLabels = tasks.map((t) => t.label);
    const y = d3.scaleBand().domain(taskLabels).range([0, innerH]).padding(0.25);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(categories)
      .range(colors.length > 0 ? colors : d3.schemeTableau10);

    const barColor = (task: GanttTask) =>
      hasCategories ? colorScale(task.category) : (colors[0] ?? '#005EB8');

    // Grid lines (vertical, time-based)
    g.append('g')
      .call(d3.axisBottom(x).tickSize(innerH).tickFormat(() => ''))
      .call((gg) => gg.select('.domain').remove())
      .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));

    // Task bars
    g.selectAll('.bar')
      .data(tasks)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (t) => x(t.start))
      .attr('y', (t) => y(t.label) ?? 0)
      .attr('width', (t) => Math.max(2, x(t.end) - x(t.start)))
      .attr('height', y.bandwidth())
      .attr('fill', barColor)
      .attr('rx', 3);

    // Bar labels — only if bar is wide enough
    g.selectAll('.bar-label')
      .data(tasks)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', (t) => x(t.start) + 4)
      .attr('y', (t) => (y(t.label) ?? 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'central')
      .attr('font-size', Math.min(11, y.bandwidth() * 0.7))
      .attr('fill', '#fff')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .each(function (t) {
        const barW = Math.max(0, x(t.end) - x(t.start));
        if (barW < 24) {
          d3.select(this).text('');
          return;
        }
        const maxChars = Math.floor(barW / 6.5);
        const label = t.label.length > maxChars ? t.label.slice(0, maxChars - 1) + '…' : t.label;
        d3.select(this).text(label);
      });

    // Today line
    if (showToday) {
      const today = new Date();
      if (today >= xDomain[0] && today <= xDomain[1]) {
        const tx = x(today);
        g.append('line')
          .attr('x1', tx).attr('x2', tx)
          .attr('y1', 0).attr('y2', innerH)
          .attr('stroke', '#d5281b')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3');
        g.append('text')
          .attr('x', tx + 3)
          .attr('y', 10)
          .attr('font-size', 9)
          .attr('fill', '#d5281b')
          .text('Today');
      }
    }

    // Y axis (task labels)
    const yAxis = g.append('g').call(d3.axisLeft(y).tickSizeOuter(0));
    yAxis.select('.domain').attr('stroke', '#d1d5db');
    yAxis.selectAll('.tick line').remove();
    yAxis
      .selectAll('text')
      .attr('font-size', Math.min(11, Math.max(8, y.bandwidth() * 0.65)))
      .attr('fill', '#374151')
      .each(function () {
        const el = d3.select(this);
        const text = String(el.text());
        if (text.length > 22) el.text(text.slice(0, 21) + '…');
      });

    // X axis (dates)
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(Math.min(8, Math.floor(innerW / 80))).tickSizeOuter(0));
    xAxis.select('.domain').attr('stroke', '#d1d5db');
    xAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');

    // Legend
    if (hasCategories) {
      const legendY = innerH + mb - legendH + 4;
      let lx = 0;
      categories.forEach((cat) => {
        g.append('rect')
          .attr('x', lx)
          .attr('y', legendY)
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', colorScale(cat));
        g.append('text')
          .attr('x', lx + 14)
          .attr('y', legendY + 8)
          .attr('font-size', 11)
          .attr('fill', '#6b7280')
          .text(cat);
        lx += cat.length * 6 + 28;
      });
    }
  }, [tasks, categories, title, showToday, colors, width, height, fontFamily]);

  return <svg ref={svgRef} />;
}
