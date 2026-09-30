'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface PyramidRow {
  ageBand: string;
  male: number;
  female: number;
}

interface DashPyramidChartProps {
  rows: PyramidRow[];
  title: string;
  asPercentage: boolean;
  maleColor: string;
  femaleColor: string;
  width: number;
  height: number;
  fontFamily: string;
  showGridLines?: boolean;
}

export default function DashPyramidChart({
  rows,
  title,
  asPercentage,
  maleColor,
  femaleColor,
  width,
  height,
  fontFamily,
  showGridLines = true,
}: DashPyramidChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (rows.length === 0) return;

    const mt = title ? 36 : 16;
    const mb = 40;
    const ml = 16;
    const mr = 16;
    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);
    if (innerW < 40 || innerH < 20) return;

    svg.attr('width', width).attr('height', height).attr('font-family', fontFamily || 'Arial');

    if (title) {
      svg.append('text')
        .attr('x', ml + innerW / 2).attr('y', 20)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', '600').attr('fill', '#111827')
        .text(title);
    }

    // Centre label column
    const labelW = Math.min(80, innerW * 0.2);
    const halfW = (innerW - labelW) / 2;

    const total = asPercentage
      ? d3.sum(rows, (r) => r.male + r.female)
      : 1;

    const maleVals = rows.map((r) => (asPercentage ? (r.male / total) * 100 : r.male));
    const femaleVals = rows.map((r) => (asPercentage ? (r.female / total) * 100 : r.female));
    const maxVal = Math.max(...maleVals, ...femaleVals);

    const g = svg.append('g').attr('transform', `translate(${ml},${mt})`);

    const y = d3.scaleBand()
      .domain(rows.map((r) => r.ageBand))
      .range([0, innerH])
      .padding(0.15);

    const xLeft = d3.scaleLinear().domain([0, maxVal]).range([halfW, 0]);
    const xRight = d3.scaleLinear().domain([0, maxVal]).range([0, halfW]);

    const leftOrigin = 0;
    const rightOrigin = halfW + labelW;

    if (showGridLines) {
      const ticks = xRight.ticks(4);
      ticks.forEach((t) => {
        const xL = leftOrigin + xLeft(t);
        const xR = rightOrigin + xRight(t);
        g.append('line').attr('x1', xL).attr('x2', xL).attr('y1', 0).attr('y2', innerH)
          .attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        g.append('line').attr('x1', xR).attr('x2', xR).attr('y1', 0).attr('y2', innerH)
          .attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
      });
    }

    // Male bars (left side — extends leftward from centre)
    rows.forEach((r, i) => {
      const val = maleVals[i];
      const barY = y(r.ageBand) ?? 0;
      const barH = y.bandwidth();
      const barX = leftOrigin + xLeft(val);
      const barW = halfW - xLeft(val);

      g.append('rect')
        .attr('x', barX).attr('y', barY)
        .attr('width', barW).attr('height', barH)
        .attr('fill', maleColor).attr('rx', 2).attr('opacity', 0.85);
    });

    // Female bars (right side)
    rows.forEach((r, i) => {
      const val = femaleVals[i];
      const barY = y(r.ageBand) ?? 0;
      const barH = y.bandwidth();
      const barW = xRight(val);

      g.append('rect')
        .attr('x', rightOrigin).attr('y', barY)
        .attr('width', barW).attr('height', barH)
        .attr('fill', femaleColor).attr('rx', 2).attr('opacity', 0.85);
    });

    // Centre labels
    rows.forEach((r) => {
      const barY = (y(r.ageBand) ?? 0) + y.bandwidth() / 2;
      g.append('text')
        .attr('x', leftOrigin + halfW + labelW / 2)
        .attr('y', barY + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', Math.min(10, y.bandwidth() - 2))
        .attr('fill', '#374151')
        .text(r.ageBand);
    });

    // X axes (left mirrored, right normal)
    const fmtTick = (v: d3.NumberValue) => {
      const n = +v;
      return asPercentage ? `${n.toFixed(1)}%` : n.toLocaleString();
    };

    const xAxisLeft = g.append('g').attr('transform', `translate(${leftOrigin},${innerH})`)
      .call(d3.axisBottom(xLeft).ticks(4).tickFormat(fmtTick).tickSizeOuter(0));
    xAxisLeft.select('.domain').attr('stroke', '#d1d5db');
    xAxisLeft.selectAll('text').attr('font-size', 11).attr('fill', '#6b7280');

    const xAxisRight = g.append('g').attr('transform', `translate(${rightOrigin},${innerH})`)
      .call(d3.axisBottom(xRight).ticks(4).tickFormat(fmtTick).tickSizeOuter(0));
    xAxisRight.select('.domain').attr('stroke', '#d1d5db');
    xAxisRight.selectAll('text').attr('font-size', 11).attr('fill', '#6b7280');

    // Legend
    const legendY = innerH + mb - 12;
    let lx = 0;
    [{ label: 'Male', color: maleColor }, { label: 'Female', color: femaleColor }].forEach((item) => {
      g.append('rect').attr('x', lx).attr('y', legendY).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', item.color);
      g.append('text').attr('x', lx + 14).attr('y', legendY + 8).attr('font-size', 11).attr('fill', '#6b7280').text(item.label);
      lx += 60;
    });
  }, [rows, title, asPercentage, maleColor, femaleColor, width, height, fontFamily, showGridLines]);

  return <svg ref={svgRef} />;
}
