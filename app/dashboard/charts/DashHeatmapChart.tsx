'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { HeatmapColorScheme } from '@/lib/dashboard/types';

export interface HeatmapData {
  rowLabel: string;
  colLabel: string;
  value: number;
}

interface DashHeatmapChartProps {
  data: HeatmapData[];
  rowOrder: string[];    // unique row labels in display order
  colOrder: string[];    // unique col labels in display order
  title: string;
  colorScheme: HeatmapColorScheme;
  showValues: boolean;
  width: number;
  height: number;
  fontFamily: string;
}

const SCHEMES: Record<HeatmapColorScheme, d3.ScaleSequential<string>> = {
  'sequential-blue': d3.scaleSequential(d3.interpolateBlues),
  'sequential-green': d3.scaleSequential(d3.interpolateGreens),
  'sequential-orange': d3.scaleSequential(d3.interpolateOranges),
  'diverging': d3.scaleSequential(d3.interpolateRdBu),
};

export default function DashHeatmapChart({
  data,
  rowOrder,
  colOrder,
  title,
  colorScheme,
  showValues,
  width,
  height,
  fontFamily,
}: DashHeatmapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (data.length === 0 || rowOrder.length === 0 || colOrder.length === 0) return;

    // Compute margins dynamically based on label lengths
    const maxRowLen = Math.max(...rowOrder.map((r) => r.length));
    const maxColLen = Math.max(...colOrder.map((c) => c.length));
    const ml = Math.min(Math.max(maxRowLen * 6 + 8, 40), 160);
    const mb = Math.min(Math.max(maxColLen * 5 + 8, 30), 100);
    const mt = title ? 30 : 10;
    const mr = 16;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    // Value extent
    const vals = data.map((d) => d.value);
    const [vMin, vMax] = d3.extent(vals) as [number, number];

    const colorScale = SCHEMES[colorScheme].copy();
    if (colorScheme === 'diverging') {
      colorScale.domain([vMax, vMin]); // red = high, blue = low for diverging
    } else {
      colorScale.domain([vMin, vMax]);
    }

    const xScale = d3.scaleBand().domain(colOrder).range([0, innerW]).padding(0.05);
    const yScale = d3.scaleBand().domain(rowOrder).range([0, innerH]).padding(0.05);

    const cellW = xScale.bandwidth();
    const cellH = yScale.bandwidth();
    const minDim = Math.min(cellW, cellH);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial')
      .append('g')
      .attr('transform', `translate(${ml},${mt})`);

    // Lookup map for quick access
    const lookup = new Map<string, number>();
    data.forEach((d) => lookup.set(`${d.rowLabel}|||${d.colLabel}`, d.value));

    // Draw cells
    const cellData: { row: string; col: string; value: number | null }[] = [];
    for (const row of rowOrder) {
      for (const col of colOrder) {
        const key = `${row}|||${col}`;
        const value = lookup.has(key) ? (lookup.get(key) as number) : null;
        cellData.push({ row, col, value });
      }
    }

    g.selectAll('.cell')
      .data(cellData)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.col) ?? 0)
      .attr('y', (d) => yScale(d.row) ?? 0)
      .attr('width', cellW)
      .attr('height', cellH)
      .attr('rx', Math.min(3, cellW * 0.1))
      .attr('fill', (d) => (d.value != null ? colorScale(d.value) : '#f3f4f6'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Cell value labels
    if (showValues && minDim >= 18) {
      const fontSize = Math.min(Math.max(minDim * 0.28, 8), 12);
      g.selectAll('.cell-label')
        .data(cellData.filter((d) => d.value != null))
        .enter()
        .append('text')
        .attr('x', (d) => (xScale(d.col) ?? 0) + cellW / 2)
        .attr('y', (d) => (yScale(d.row) ?? 0) + cellH / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', fontSize)
        .attr('fill', (d) => {
          // Pick white or dark text depending on background luminance
          const bg = colorScale(d.value as number);
          const rgb = d3.color(bg)?.rgb();
          if (!rgb) return '#000';
          const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
          return lum > 0.5 ? '#111827' : '#ffffff';
        })
        .text((d) => {
          const v = d.value as number;
          return Math.abs(v) >= 1000
            ? d3.format('.3s')(v)
            : v % 1 === 0
              ? String(v)
              : d3.format('.2~f')(v);
        });
    }

    // X axis (column labels — rotated if many or long)
    const rotateCols = colOrder.length > 8 || maxColLen > 6;
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .attr('font-size', 9)
      .call((ax) => ax.select('.domain').attr('stroke', '#e5e7eb'));

    if (rotateCols) {
      xAxis
        .selectAll('.tick text')
        .attr('transform', 'rotate(-40)')
        .attr('text-anchor', 'end')
        .attr('dy', '0.35em')
        .attr('dx', '-0.4em');
    } else {
      xAxis.selectAll('.tick text').attr('dy', '1em');
    }

    // Truncate long x labels
    xAxis.selectAll('.tick text').text(function () {
      const s = (d3.select(this).text() as string);
      return s.length > 14 ? s.slice(0, 13) + '…' : s;
    });

    // Y axis (row labels)
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .attr('font-size', 9)
      .call((ax) => ax.select('.domain').attr('stroke', '#e5e7eb'))
      .selectAll('.tick text')
      .attr('dx', '-4')
      .text(function () {
        const s = d3.select(this).text() as string;
        const maxCh = Math.max(8, Math.floor(ml / 7));
        return s.length > maxCh ? s.slice(0, maxCh - 1) + '…' : s;
      });

    // Title
    if (title) {
      svg
        .append('text')
        .attr('x', ml + innerW / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', '600')
        .attr('fill', '#111827')
        .text(title);
    }

    // Legend (compact gradient bar at bottom-right)
    if (innerW > 120) {
      const legendW = Math.min(100, innerW * 0.3);
      const legendH = 8;
      const legendX = ml + innerW - legendW;
      const legendY = height - 14;

      const defs = svg.append('defs');
      const gradId = 'hmap-grad-' + Math.random().toString(36).slice(2);
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%').attr('x2', '100%');

      const stops = d3.range(0, 1.01, 0.1);
      stops.forEach((t) => {
        const val = colorScheme === 'diverging'
          ? vMax + t * (vMin - vMax)
          : vMin + t * (vMax - vMin);
        grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', colorScale(val));
      });

      svg.append('rect')
        .attr('x', legendX).attr('y', legendY)
        .attr('width', legendW).attr('height', legendH)
        .attr('fill', `url(#${gradId})`)
        .attr('rx', 2);

      const fmt = (v: number) =>
        Math.abs(v) >= 1000 ? d3.format('.2s')(v) : d3.format('.3~g')(v);

      svg.append('text').attr('x', legendX).attr('y', legendY - 2)
        .attr('font-size', 8).attr('fill', '#9ca3af').attr('text-anchor', 'start').text(fmt(vMin));
      svg.append('text').attr('x', legendX + legendW).attr('y', legendY - 2)
        .attr('font-size', 8).attr('fill', '#9ca3af').attr('text-anchor', 'end').text(fmt(vMax));
    }
  }, [data, rowOrder, colOrder, title, colorScheme, showValues, width, height, fontFamily]);

  return <svg ref={svgRef} />;
}
