'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ReferenceLine } from '@/lib/dashboard/types';

interface DashAreaChartProps {
  data: Record<string, string | number | null>[];
  xColumn: string;
  yColumns: string[];
  title: string;
  xLabel: string;
  yLabel: string;
  stacked: boolean;
  colors: string[];
  referenceLines?: ReferenceLine[];
  width: number;
  height: number;
  fontFamily: string;
  showGridLines: boolean;
}

export default function DashAreaChart({
  data,
  xColumn,
  yColumns,
  title,
  xLabel,
  yLabel,
  stacked,
  colors,
  referenceLines = [],
  width,
  height,
  fontFamily,
  showGridLines,
}: DashAreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!data.length || !xColumn || !yColumns.length) return;

    const mt = title ? 36 : 12;
    const mb = xLabel ? 56 : 40;
    const ml = 52;
    const mr = 16;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    if (innerW < 20 || innerH < 20) return;

    // Filter rows where xColumn is non-null
    const validData = data.filter((r) => r[xColumn] != null && r[xColumn] !== '');

    if (validData.length === 0) return;

    const root = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font-family', fontFamily || 'Arial');

    // Title
    if (title) {
      root
        .append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', '600')
        .attr('fill', '#111827')
        .text(title);
    }

    const g = root.append('g').attr('transform', `translate(${ml},${mt})`);

    // X scale — treat as categories (scalePoint), same as DashLineChart
    const xDomain = validData.map((r) => String(r[xColumn] ?? ''));
    const xScale = d3
      .scalePoint<string>()
      .domain(xDomain)
      .range([0, innerW])
      .padding(0.5);

    const colorOf = (i: number) => colors[i % colors.length] ?? '#005EB8';
    const refVals = referenceLines.map((rl) => rl.value).filter(isFinite);

    let sharedYScale: d3.ScaleLinear<number, number> | null = null;

    if (stacked) {
      // Stacked areas using d3.stack()
      const stackedData = d3
        .stack<Record<string, string | number | null>>()
        .keys(yColumns)
        .value((row, key) => {
          const v = Number(row[key]);
          return isFinite(v) ? v : 0;
        })(validData);

      const yMax = d3.max([
        d3.max(stackedData[stackedData.length - 1], (d) => d[1]) ?? 1,
        ...refVals,
      ]) ?? 1;
      const yScale = d3
        .scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([innerH, 0]);
      sharedYScale = yScale;

      // Grid lines
      if (showGridLines) {
        g.append('g')
          .call(
            d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''),
          )
          .call((gg) => gg.select('.domain').remove())
          .call((gg) =>
            gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'),
          );
      }

      const areaGen = d3
        .area<[number, number]>()
        .x((_, i) => xScale(xDomain[i]) ?? 0)
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX)
        .defined((d) => isFinite(d[0]) && isFinite(d[1]));

      stackedData.forEach((layer, i) => {
        g.append('path')
          .datum(layer as unknown as [number, number][])
          .attr('fill', colorOf(i))
          .attr('fill-opacity', 0.7)
          .attr('stroke', colorOf(i))
          .attr('stroke-width', 1)
          .attr('d', areaGen);
      });

      // Y axis
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .call((ax) => ax.select('.domain').attr('stroke', '#d1d5db'))
        .selectAll('text')
        .attr('font-size', 10)
        .attr('fill', '#6b7280');
    } else {
      // Non-stacked: individual filled areas + lines
      const allVals = yColumns
        .flatMap((col) => validData.map((r) => Number(r[col])))
        .filter(isFinite);
      const yMax = d3.max([...allVals, ...refVals]) ?? 1;
      const yScale = d3
        .scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([innerH, 0]);
      sharedYScale = yScale;

      // Grid lines
      if (showGridLines) {
        g.append('g')
          .call(
            d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''),
          )
          .call((gg) => gg.select('.domain').remove())
          .call((gg) =>
            gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'),
          );
      }

      yColumns.forEach((col, i) => {
        const c = colorOf(i);

        const areaGen = d3
          .area<Record<string, string | number | null>>()
          .x((r) => xScale(String(r[xColumn] ?? '')) ?? 0)
          .y0(innerH)
          .y1((r) => yScale(Math.max(0, Number(r[col]))))
          .curve(d3.curveMonotoneX)
          .defined((r) => isFinite(Number(r[col])));

        const lineGen = d3
          .line<Record<string, string | number | null>>()
          .x((r) => xScale(String(r[xColumn] ?? '')) ?? 0)
          .y((r) => yScale(Number(r[col])))
          .curve(d3.curveMonotoneX)
          .defined((r) => isFinite(Number(r[col])));

        const seriesData = validData.filter((r) => isFinite(Number(r[col])));

        g.append('path')
          .datum(seriesData)
          .attr('fill', c)
          .attr('fill-opacity', 0.4)
          .attr('stroke', 'none')
          .attr('d', areaGen);

        g.append('path')
          .datum(seriesData)
          .attr('fill', 'none')
          .attr('stroke', c)
          .attr('stroke-width', 2)
          .attr('d', lineGen);
      });

      // Y axis
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .call((ax) => ax.select('.domain').attr('stroke', '#d1d5db'))
        .selectAll('text')
        .attr('font-size', 10)
        .attr('fill', '#6b7280');
    }

    // Reference lines
    if (sharedYScale) {
      const ys = sharedYScale;
      referenceLines.forEach((rl) => {
        if (!isFinite(rl.value)) return;
        const yv = ys(rl.value);
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
    }

    // X axis — rotate labels if >8 points or any label is long
    const maxLabelLen = Math.max(...xDomain.map((s) => s.length));
    const rotateLbls = xDomain.length > 8 || maxLabelLen > 8;

    const maxLabels = Math.floor(innerW / 60);
    const every = Math.max(1, Math.ceil(xDomain.length / maxLabels));
    const xAxisTicks = xScale.domain().filter((_, idx) => idx % every === 0);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3.axisBottom(xScale).tickSizeOuter(0).tickValues(xAxisTicks),
      );

    xAxisGroup.select('.domain').attr('stroke', '#d1d5db');

    if (rotateLbls) {
      xAxisGroup
        .selectAll('text')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .attr('transform', 'rotate(-35)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.15em');
    } else {
      xAxisGroup
        .selectAll('text')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .attr('dy', '1em');
    }

    // Y label
    if (yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -ml + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .text(yLabel);
    }

    // X label
    if (xLabel) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + mb - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#9ca3af')
        .text(xLabel);
    }

    // Legend (horizontal at top-right if multiple series)
    if (yColumns.length > 1) {
      const legend = root
        .append('g')
        .attr('transform', `translate(${ml},${height - 10})`);
      yColumns.forEach((col, i) => {
        const lx = i * 120;
        legend
          .append('rect')
          .attr('x', lx)
          .attr('y', -7)
          .attr('width', 14)
          .attr('height', 8)
          .attr('rx', 1)
          .attr('fill', colorOf(i))
          .attr('fill-opacity', 0.7);
        legend
          .append('text')
          .attr('x', lx + 18)
          .attr('y', 0)
          .attr('font-size', 10)
          .attr('fill', '#6b7280')
          .text(col);
      });
    }
  }, [data, xColumn, yColumns, title, xLabel, yLabel, stacked, colors, referenceLines, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
