'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DashScatterChartProps {
  data: Record<string, string | number | null>[];
  xColumn: string;
  yColumn: string;
  colorColumn: string;    // empty = single color
  sizeColumn: string;     // empty = fixed size
  title: string;
  xLabel: string;
  yLabel: string;
  pointColor: string;
  width: number;
  height: number;
  fontFamily: string;
  showGridLines: boolean;
}

const MAX_COLOR_CATS = 8;

export default function DashScatterChart({
  data,
  xColumn,
  yColumn,
  colorColumn,
  sizeColumn,
  title,
  xLabel,
  yLabel,
  pointColor,
  width,
  height,
  fontFamily,
  showGridLines,
}: DashScatterChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!data.length || !xColumn || !yColumn) return;

    const mt = title ? 36 : 12;
    const mb = xLabel ? 56 : 40;
    const ml = 56;
    const mr = colorColumn ? 120 : 16;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    if (innerW < 20 || innerH < 20) return;

    // Filter to rows with valid x and y numbers
    const validData = data.filter((r) => {
      const xv = Number(r[xColumn]);
      const yv = Number(r[yColumn]);
      return isFinite(xv) && isFinite(yv);
    });

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

    // Scales
    const xExtent = d3.extent(validData, (r) => Number(r[xColumn])) as [number, number];
    const yExtent = d3.extent(validData, (r) => Number(r[yColumn])) as [number, number];

    const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
    const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

    // Size scale
    let sizeOf: (r: Record<string, string | number | null>) => number;
    if (sizeColumn) {
      const sizeExtent = d3.extent(
        validData.filter((r) => isFinite(Number(r[sizeColumn]))),
        (r) => Number(r[sizeColumn]),
      ) as [number, number];
      const sizeScale = d3.scaleSqrt().domain(sizeExtent).range([3, 12]).clamp(true);
      sizeOf = (r) => {
        const sv = Number(r[sizeColumn]);
        return isFinite(sv) ? sizeScale(sv) : 5;
      };
    } else {
      sizeOf = () => 5;
    }

    // Color scale
    let colorOf: (r: Record<string, string | number | null>) => string;
    let colorCategories: string[] = [];
    if (colorColumn) {
      colorCategories = Array.from(
        new Set(validData.map((r) => String(r[colorColumn] ?? ''))),
      );
      const colorScale = d3
        .scaleOrdinal<string>()
        .domain(colorCategories)
        .range(d3.schemeTableau10);
      colorOf = (r) => colorScale(String(r[colorColumn] ?? ''));
    } else {
      colorOf = () => pointColor || '#005EB8';
    }

    // Grid lines
    if (showGridLines) {
      // Horizontal grid
      g.append('g')
        .call(
          d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''),
        )
        .call((gg) => gg.select('.domain').remove())
        .call((gg) =>
          gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'),
        );

      // Vertical grid
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3.axisBottom(xScale).tickSize(-innerH).tickFormat(() => ''),
        )
        .call((gg) => gg.select('.domain').remove())
        .call((gg) =>
          gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'),
        );
    }

    // Points
    g.selectAll('.dot')
      .data(validData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (r) => xScale(Number(r[xColumn])))
      .attr('cy', (r) => yScale(Number(r[yColumn])))
      .attr('r', (r) => sizeOf(r))
      .attr('fill', (r) => colorOf(r))
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);

    // X axis
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSizeOuter(0));

    xAxisGroup.select('.domain').attr('stroke', '#d1d5db');
    xAxisGroup.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

    // Y axis
    const yAxisGroup = g.append('g').call(d3.axisLeft(yScale).ticks(5));
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

    // X label
    if (xLabel) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + mb - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .text(xLabel);
    }

    // Y label (rotated)
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

    // Color legend (vertical, right side)
    if (colorColumn && colorCategories.length > 0) {
      const colorScale = d3
        .scaleOrdinal<string>()
        .domain(colorCategories)
        .range(d3.schemeTableau10);

      const legendX = ml + innerW + 12;
      const legendTop = mt + 8;
      const rowH = 18;
      const shown = colorCategories.slice(0, MAX_COLOR_CATS);
      const overflow = colorCategories.length - shown.length;

      const legendG = root.append('g').attr('transform', `translate(${legendX},${legendTop})`);

      shown.forEach((cat, i) => {
        const ry = i * rowH;
        legendG
          .append('circle')
          .attr('cx', 5)
          .attr('cy', ry + 5)
          .attr('r', 5)
          .attr('fill', colorScale(cat))
          .attr('fill-opacity', 0.8);

        const truncated = cat.length > 12 ? cat.slice(0, 11) + '…' : cat;
        legendG
          .append('text')
          .attr('x', 14)
          .attr('y', ry + 5)
          .attr('dominant-baseline', 'central')
          .attr('font-size', 10)
          .attr('fill', '#374151')
          .text(truncated);
      });

      if (overflow > 0) {
        legendG
          .append('text')
          .attr('x', 0)
          .attr('y', shown.length * rowH + 8)
          .attr('font-size', 9)
          .attr('fill', '#9ca3af')
          .text(`+${overflow} more`);
      }
    }
  }, [data, xColumn, yColumn, colorColumn, sizeColumn, title, xLabel, yLabel, pointColor, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
