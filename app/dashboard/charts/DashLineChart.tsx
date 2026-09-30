'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DatasetRow, ReferenceLine, AnnotationDef } from '@/lib/dashboard/types';

interface DashLineChartProps {
  data: DatasetRow[];
  xColumn: string;
  yColumns: string[];
  title: string;
  xLabel: string;
  yLabel: string;
  colors: string[];
  showPoints: boolean;
  referenceLines?: ReferenceLine[];
  annotations?: AnnotationDef[];
  width: number;
  height: number;
  fontFamily?: string;
  showGridLines?: boolean;
  onPointClick?: (xValue: string) => void;
}

// Try to parse a column as dates; return a d3.scaleTime if successful.
function tryDateScale(
  values: (string | number | null)[],
  range: [number, number],
): d3.ScaleTime<number, number> | null {
  const parsed = values.map((v) => (v != null ? new Date(String(v)) : null));
  if (parsed.some((d) => d === null || isNaN(d.getTime()))) return null;
  const extent = d3.extent(parsed as Date[]) as [Date, Date];
  return d3.scaleTime().domain(extent).range(range).nice();
}

export default function DashLineChart({
  data,
  xColumn,
  yColumns,
  title,
  xLabel,
  yLabel,
  colors,
  showPoints,
  referenceLines = [],
  annotations = [],
  width,
  height,
  fontFamily = 'Arial',
  showGridLines = true,
  onPointClick,
}: DashLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!data.length || !xColumn || !yColumns.length) return;

    const marginTop = title ? 32 : 16;
    const marginBottom = 52;
    const marginLeft = 52;
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

    // Determine x scale — time or band
    const xValues = data.map((r) => r[xColumn]);
    const dateScale = tryDateScale(xValues, [0, innerW]);

    let xScaleTime: d3.ScaleTime<number, number> | null = null;
    let xScaleBand: d3.ScalePoint<string> | null = null;

    if (dateScale) {
      xScaleTime = dateScale;
    } else {
      xScaleBand = d3
        .scalePoint<string>()
        .domain(data.map((r) => String(r[xColumn] ?? '')))
        .range([0, innerW])
        .padding(0.5);
    }

    const xPos = (r: DatasetRow): number => {
      if (xScaleTime) return xScaleTime(new Date(String(r[xColumn] ?? '')));
      return xScaleBand!(String(r[xColumn] ?? '')) ?? 0;
    };

    // y domain across all series (extend to fit reference lines)
    const allVals = yColumns.flatMap((col) => data.map((r) => Number(r[col]))).filter(isFinite);
    const refVals = referenceLines.map((rl) => rl.value).filter(isFinite);
    const yMin = d3.min([...allVals, ...refVals]) ?? 0;
    const yMax = d3.max([...allVals, ...refVals]) ?? 1;

    const y = d3
      .scaleLinear()
      .domain([Math.min(0, yMin), yMax])
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

    // Reference lines (drawn behind series)
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

    // Annotation markers (vertical lines / shaded regions)
    annotations.forEach((ann) => {
      const color = ann.color || '#6b7280';
      let x1: number | null = null;
      let x2: number | null = null;

      if (xScaleTime) {
        const d1 = new Date(ann.date);
        if (!isNaN(d1.getTime())) x1 = xScaleTime(d1);
        if (ann.endDate) {
          const d2 = new Date(ann.endDate);
          if (!isNaN(d2.getTime())) x2 = xScaleTime(d2);
        }
      } else if (xScaleBand) {
        x1 = xScaleBand(ann.date) ?? null;
        if (ann.endDate) x2 = xScaleBand(ann.endDate) ?? null;
      }

      if (x1 === null) return;

      // Shaded region for date range
      if (ann.endDate && x2 !== null) {
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        g.append('rect')
          .attr('x', left)
          .attr('width', Math.max(1, right - left))
          .attr('y', 0)
          .attr('height', innerH)
          .attr('fill', color)
          .attr('opacity', 0.08);
      }

      // Vertical dashed line at start date
      g.append('line')
        .attr('x1', x1).attr('x2', x1)
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.75);

      // Label at top of line
      g.append('text')
        .attr('x', x1 + 3)
        .attr('y', 9)
        .attr('font-size', 9)
        .attr('fill', color)
        .attr('opacity', 0.9)
        .text(ann.label);
    });

    // Lines + optional points per series
    yColumns.forEach((col, i) => {
      const seriesColor = colors[i] ?? '#005EB8';
      const seriesData = data.filter((r) => isFinite(Number(r[col])));

      const lineGen = d3
        .line<DatasetRow>()
        .x(xPos)
        .y((r) => y(Number(r[col])))
        .defined((r) => isFinite(Number(r[col])));

      g.append('path')
        .datum(seriesData)
        .attr('fill', 'none')
        .attr('stroke', seriesColor)
        .attr('stroke-width', 2)
        .attr('d', lineGen);

      if (showPoints) {
        g.selectAll(`.dot-${i}`)
          .data(seriesData)
          .join('circle')
          .attr('class', `dot-${i}`)
          .attr('cx', xPos)
          .attr('cy', (r) => y(Number(r[col])))
          .attr('r', 3)
          .attr('fill', seriesColor)
          .style('cursor', onPointClick ? 'pointer' : 'default')
          .on('click', onPointClick ? (event, r) => {
            event.stopPropagation();
            onPointClick(String(r[xColumn] ?? ''));
          } : null);
      }
    });

    // X axis
    const xAxisGroup = g.append('g').attr('transform', `translate(0,${innerH})`);

    if (xScaleTime) {
      xAxisGroup.call(d3.axisBottom(xScaleTime).ticks(5).tickSizeOuter(0));
    } else {
      const maxLabels = Math.floor(innerW / 60);
      const every = Math.ceil(data.length / maxLabels);
      xAxisGroup.call(
        d3
          .axisBottom(xScaleBand!)
          .tickSizeOuter(0)
          .tickValues(
            xScaleBand!
              .domain()
              .filter((_, idx) => idx % every === 0),
          ),
      );
    }

    xAxisGroup.select('.domain').attr('stroke', '#d1d5db');
    xAxisGroup
      .selectAll('text')
      .attr('font-size', 12)
      .attr('fill', '#6b7280')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.15em');

    // Y axis
    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5));
    yAxis.select('.domain').attr('stroke', '#d1d5db');
    yAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');

    // Axis labels
    if (xLabel) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + marginBottom - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#9ca3af')
        .text(xLabel);
    }
    if (yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -marginLeft + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#9ca3af')
        .text(yLabel);
    }

    // Legend (if multiple series)
    if (yColumns.length > 1) {
      const legend = root
        .append('g')
        .attr('transform', `translate(${marginLeft},${height - 12})`);
      yColumns.forEach((col, i) => {
        const lx = i * 120;
        legend.append('line')
          .attr('x1', lx)
          .attr('x2', lx + 16)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', colors[i] ?? '#005EB8')
          .attr('stroke-width', 2);
        legend.append('text')
          .attr('x', lx + 20)
          .attr('y', 4)
          .attr('font-size', 12)
          .attr('fill', '#6b7280')
          .text(col);
      });
    }
  }, [data, xColumn, yColumns, title, xLabel, yLabel, colors, showPoints, referenceLines, annotations, width, height, fontFamily, showGridLines, onPointClick]);

  return <svg ref={svgRef} />;
}
