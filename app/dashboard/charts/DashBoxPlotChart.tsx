'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface BoxGroup {
  label: string;
  values: number[];
}

interface DashBoxPlotChartProps {
  groups: BoxGroup[];
  title: string;
  yLabel: string;
  showOutliers: boolean;
  color: string;
  width: number;
  height: number;
  fontFamily: string;
  showGridLines?: boolean;
}

function boxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = d3.quantile(sorted, 0.25) ?? 0;
  const median = d3.quantile(sorted, 0.5) ?? 0;
  const q3 = d3.quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const whiskerLow = sorted.find((v) => v >= lo) ?? sorted[0];
  const whiskerHigh = [...sorted].reverse().find((v) => v <= hi) ?? sorted[sorted.length - 1];
  const outliers = sorted.filter((v) => v < whiskerLow || v > whiskerHigh);
  return { q1, median, q3, whiskerLow, whiskerHigh, outliers };
}

export default function DashBoxPlotChart({
  groups,
  title,
  yLabel,
  showOutliers,
  color,
  width,
  height,
  fontFamily,
  showGridLines = true,
}: DashBoxPlotChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (groups.length === 0) return;

    const mt = title ? 36 : 16;
    const mb = groups.length > 1 ? 50 : 30;
    const ml = yLabel ? 60 : 50;
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

    const stats = groups.map((g) => ({ label: g.label, ...boxStats(g.values) }));
    const allValues = groups.flatMap((g) => g.values);
    const yMin = d3.min(allValues) ?? 0;
    const yMax = d3.max(allValues) ?? 1;

    const g = svg.append('g').attr('transform', `translate(${ml},${mt})`);

    const x = d3.scaleBand()
      .domain(stats.map((s) => s.label))
      .range([0, innerW])
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([yMin - (yMax - yMin) * 0.05, yMax + (yMax - yMin) * 0.05])
      .nice()
      .range([innerH, 0]);

    if (showGridLines) {
      g.append('g')
        .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(() => ''))
        .call((gg) => gg.select('.domain').remove())
        .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));
    }

    const boxW = Math.min(x.bandwidth(), 60);
    const boxOffset = (x.bandwidth() - boxW) / 2;

    stats.forEach((s) => {
      const cx = (x(s.label) ?? 0) + x.bandwidth() / 2;
      const bx = (x(s.label) ?? 0) + boxOffset;

      // IQR box
      g.append('rect')
        .attr('x', bx).attr('y', y(s.q3))
        .attr('width', boxW).attr('height', Math.max(1, y(s.q1) - y(s.q3)))
        .attr('fill', color).attr('fill-opacity', 0.7)
        .attr('stroke', color).attr('stroke-width', 1.5).attr('rx', 2);

      // Median line
      g.append('line')
        .attr('x1', bx).attr('x2', bx + boxW)
        .attr('y1', y(s.median)).attr('y2', y(s.median))
        .attr('stroke', '#1f2937').attr('stroke-width', 2);

      // Whiskers
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(s.q3)).attr('y2', y(s.whiskerHigh))
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,2');
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(s.q1)).attr('y2', y(s.whiskerLow))
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,2');

      // Whisker caps
      const capW = boxW * 0.4;
      [[s.whiskerHigh], [s.whiskerLow]].forEach(([wv]) => {
        g.append('line')
          .attr('x1', cx - capW / 2).attr('x2', cx + capW / 2)
          .attr('y1', y(wv)).attr('y2', y(wv))
          .attr('stroke', color).attr('stroke-width', 1.5);
      });

      // Outliers
      if (showOutliers) {
        s.outliers.forEach((v) => {
          g.append('circle')
            .attr('cx', cx).attr('cy', y(v))
            .attr('r', 3)
            .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5).attr('opacity', 0.7);
        });
      }
    });

    // Axes
    const xAxis = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
    xAxis.select('.domain').attr('stroke', '#d1d5db');
    xAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');
    if (stats.length > 4) {
      xAxis.selectAll('text')
        .attr('transform', 'rotate(-35)').attr('text-anchor', 'end').attr('dx', '-0.5em').attr('dy', '0.15em');
    }

    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5));
    yAxis.select('.domain').attr('stroke', '#d1d5db');
    yAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');

    if (yLabel) {
      svg.append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -(mt + innerH / 2)).attr('y', 14)
        .attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#6b7280')
        .text(yLabel);
    }
  }, [groups, title, yLabel, showOutliers, color, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
