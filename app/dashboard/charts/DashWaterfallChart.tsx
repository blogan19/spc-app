'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface WaterfallBar {
  label: string;
  value: number;
  isSubtotal: boolean;
}

interface DashWaterfallChartProps {
  bars: WaterfallBar[];
  title: string;
  positiveColor: string;
  negativeColor: string;
  subtotalColor: string;
  width: number;
  height: number;
  fontFamily: string;
  showGridLines?: boolean;
}

export default function DashWaterfallChart({
  bars,
  title,
  positiveColor,
  negativeColor,
  subtotalColor,
  width,
  height,
  fontFamily,
  showGridLines = true,
}: DashWaterfallChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (bars.length === 0) return;

    const mt = title ? 36 : 16;
    const mb = 60;
    const ml = 56;
    const mr = 16;
    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);
    if (innerW < 20 || innerH < 20) return;

    svg.attr('width', width).attr('height', height).attr('font-family', fontFamily || 'Arial');

    if (title) {
      svg.append('text')
        .attr('x', ml + innerW / 2).attr('y', 20)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', '600').attr('fill', '#111827')
        .text(title);
    }

    // Compute running totals
    type Segment = { label: string; start: number; end: number; isSubtotal: boolean; positive: boolean };
    const segments: Segment[] = [];
    let running = 0;
    for (const bar of bars) {
      if (bar.isSubtotal) {
        segments.push({ label: bar.label, start: 0, end: running, isSubtotal: true, positive: running >= 0 });
      } else {
        const start = running;
        running += bar.value;
        segments.push({ label: bar.label, start, end: running, isSubtotal: false, positive: bar.value >= 0 });
      }
    }

    const allY = segments.flatMap((s) => [s.start, s.end]);
    const yMin = Math.min(0, ...allY);
    const yMax = Math.max(0, ...allY);

    const g = svg.append('g').attr('transform', `translate(${ml},${mt})`);

    const x = d3.scaleBand().domain(segments.map((s) => s.label)).range([0, innerW]).padding(0.3);
    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerH, 0]);

    if (showGridLines) {
      g.append('g')
        .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(() => ''))
        .call((gg) => gg.select('.domain').remove())
        .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));
    }

    // Zero line
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', '#d1d5db').attr('stroke-width', 1);

    // Connectors between bars
    segments.forEach((seg, i) => {
      if (i === segments.length - 1) return;
      const next = segments[i + 1];
      if (next.isSubtotal) return;
      const x1 = (x(seg.label) ?? 0) + x.bandwidth();
      const x2 = x(next.label) ?? 0;
      const yConn = y(seg.end);
      g.append('line')
        .attr('x1', x1).attr('x2', x2)
        .attr('y1', yConn).attr('y2', yConn)
        .attr('stroke', '#9ca3af').attr('stroke-width', 1).attr('stroke-dasharray', '3,2');
    });

    // Bars
    segments.forEach((seg) => {
      const barX = x(seg.label) ?? 0;
      const barTop = y(Math.max(seg.start, seg.end));
      const barH = Math.abs(y(seg.start) - y(seg.end));
      const fill = seg.isSubtotal ? subtotalColor : seg.positive ? positiveColor : negativeColor;

      g.append('rect')
        .attr('x', barX).attr('y', barTop)
        .attr('width', x.bandwidth()).attr('height', Math.max(2, barH))
        .attr('fill', fill).attr('rx', 3);

      // Value label above/below bar
      const labelY = seg.positive || seg.isSubtotal ? barTop - 4 : barTop + barH + 12;
      const val = seg.isSubtotal ? seg.end : seg.end - seg.start;
      g.append('text')
        .attr('x', barX + x.bandwidth() / 2).attr('y', labelY)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#374151')
        .text(val >= 0 ? `+${val.toLocaleString()}` : val.toLocaleString());
    });

    // Axes
    const xAxis = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
    xAxis.select('.domain').attr('stroke', '#d1d5db');
    xAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280')
      .attr('transform', 'rotate(-35)').attr('text-anchor', 'end').attr('dx', '-0.5em').attr('dy', '0.15em');

    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5));
    yAxis.select('.domain').attr('stroke', '#d1d5db');
    yAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

    // Legend
    const items = [
      { label: 'Positive', color: positiveColor },
      { label: 'Negative', color: negativeColor },
      { label: 'Subtotal', color: subtotalColor },
    ];
    let lx = 0;
    const legendY = innerH + mb - 12;
    items.forEach((item) => {
      g.append('rect').attr('x', lx).attr('y', legendY).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
      g.append('text').attr('x', lx + 14).attr('y', legendY + 8).attr('font-size', 9).attr('fill', '#6b7280').text(item.label);
      lx += 72;
    });
  }, [bars, title, positiveColor, negativeColor, subtotalColor, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
