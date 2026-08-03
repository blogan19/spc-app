'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DatasetRow, ReferenceLine } from '@/lib/dashboard/types';

interface BarChartProps {
  data: DatasetRow[];
  xColumn: string;
  yColumn: string;
  orientation: 'vertical' | 'horizontal';
  title: string;
  xLabel: string;
  yLabel: string;
  color: string;
  referenceLines?: ReferenceLine[];
  onDataPointClick?: (column: string, value: string) => void;
  width: number;
  height: number;
  fontFamily?: string;
  showGridLines?: boolean;
}

export default function BarChart({
  data,
  xColumn,
  yColumn,
  orientation,
  title,
  xLabel,
  yLabel,
  color,
  referenceLines = [],
  onDataPointClick,
  width,
  height,
  fontFamily = 'Arial',
  showGridLines = true,
}: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!data.length || !xColumn || !yColumn) return;

    const rows = data
      .map((r) => ({ cat: String(r[xColumn] ?? ''), val: Number(r[yColumn]) }))
      .filter((r) => r.cat !== '' && isFinite(r.val));

    if (!rows.length) return;

    const marginTop = title ? 32 : 16;
    const marginBottom = orientation === 'vertical' ? 60 : 40;
    const marginLeft = orientation === 'vertical' ? 48 : 120;
    const marginRight = 16;

    const innerW = width - marginLeft - marginRight;
    const innerH = height - marginTop - marginBottom;

    if (innerW < 20 || innerH < 20) return;

    const root = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font-family', fontFamily);

    if (title) {
      root
        .append('text')
        .attr('x', width / 2)
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', '600')
        .attr('fill', '#1f2937')
        .text(title);
    }

    const g = root.append('g').attr('transform', `translate(${marginLeft},${marginTop})`);

    if (orientation === 'vertical') {
      const x = d3
        .scaleBand()
        .domain(rows.map((r) => r.cat))
        .range([0, innerW])
        .padding(0.25);

      const refVals = referenceLines.map((rl) => rl.value).filter(isFinite);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max([...rows.map((r) => r.val), ...refVals]) ?? 1])
        .nice()
        .range([innerH, 0]);

      // Grid lines
      if (showGridLines) {
        g.append('g')
          .attr('class', 'grid')
          .call(
            d3
              .axisLeft(y)
              .tickSize(-innerW)
              .tickFormat(() => ''),
          )
          .call((gg) => gg.select('.domain').remove())
          .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));
      }

      g.selectAll('.bar')
        .data(rows)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (r) => x(r.cat) ?? 0)
        .attr('y', (r) => y(r.val))
        .attr('width', x.bandwidth())
        .attr('height', (r) => innerH - y(r.val))
        .attr('fill', color)
        .attr('rx', 3)
        .style('cursor', onDataPointClick ? 'pointer' : 'default')
        .on('click', onDataPointClick ? (event, r) => {
          event.stopPropagation();
          onDataPointClick(xColumn, r.cat);
        } : null);

      // Reference lines (vertical orientation only)
      referenceLines.forEach((rl) => {
        if (!isFinite(rl.value)) return;
        const yv = y(rl.value);
        const lineColor = rl.color || '#d5281b';
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yv).attr('y2', yv)
          .attr('stroke', lineColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3');
        g.append('text')
          .attr('x', innerW - 3)
          .attr('y', yv - 4)
          .attr('text-anchor', 'end')
          .attr('font-size', 9)
          .attr('fill', lineColor)
          .text(rl.label);
      });

      // X axis
      const xAxis = g
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));
      xAxis.select('.domain').attr('stroke', '#d1d5db');
      xAxis
        .selectAll('text')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .attr('transform', 'rotate(-35)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.15em');

      // Y axis
      const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5));
      yAxis.select('.domain').attr('stroke', '#d1d5db');
      yAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

      // Labels
      if (xLabel) {
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', innerH + marginBottom - 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', '#9ca3af')
          .text(xLabel);
      }
      if (yLabel) {
        g.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2)
          .attr('y', -marginLeft + 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', '#9ca3af')
          .text(yLabel);
      }
    } else {
      // Horizontal bars
      const y = d3
        .scaleBand()
        .domain(rows.map((r) => r.cat))
        .range([0, innerH])
        .padding(0.25);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(rows, (r) => r.val) ?? 1])
        .nice()
        .range([0, innerW]);

      // Grid lines
      if (showGridLines) {
        g.append('g')
          .attr('class', 'grid')
          .call(
            d3
              .axisBottom(x)
              .tickSize(innerH)
              .tickFormat(() => ''),
          )
          .call((gg) => gg.select('.domain').remove())
          .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));
      }

      g.selectAll('.bar')
        .data(rows)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (r) => y(r.cat) ?? 0)
        .attr('width', (r) => x(r.val))
        .attr('height', y.bandwidth())
        .attr('fill', color)
        .attr('rx', 3);

      // Y axis (categories)
      const yAxis = g.append('g').call(d3.axisLeft(y).tickSizeOuter(0));
      yAxis.select('.domain').attr('stroke', '#d1d5db');
      yAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

      // X axis (values)
      const xAxis = g
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5));
      xAxis.select('.domain').attr('stroke', '#d1d5db');
      xAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

      // Labels
      if (xLabel) {
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', innerH + marginBottom - 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', '#9ca3af')
          .text(xLabel);
      }
      if (yLabel) {
        g.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2)
          .attr('y', -marginLeft + 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', '#9ca3af')
          .text(yLabel);
      }
    }
  }, [data, xColumn, yColumn, orientation, title, xLabel, yLabel, color, referenceLines, onDataPointClick, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
