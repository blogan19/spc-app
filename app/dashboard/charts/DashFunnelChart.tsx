'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { FunnelAnalysis } from '@/lib/spc/funnel';

interface DashFunnelChartProps {
  analysis: FunnelAnalysis;
  title: string;
  yLabel: string;
  asPercentage: boolean;
  color: string;
  width: number;
  height: number;
  fontFamily: string;
}

export default function DashFunnelChart({
  analysis,
  title,
  yLabel,
  asPercentage,
  color,
  width,
  height,
  fontFamily,
}: DashFunnelChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { units, pooledRate, curve, denominatorRange } = analysis;
    if (units.length === 0) return;

    const mt = title ? 36 : 16;
    const mb = 52;
    const ml = 56;
    const mr = 16;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);
    if (innerW < 40 || innerH < 40) return;

    const scale = asPercentage ? 100 : 1;
    const fmt = asPercentage
      ? (v: number) => `${(v * 100).toFixed(1)}%`
      : (v: number) => v.toFixed(3);

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
    const xPad = (denominatorRange.max - denominatorRange.min) * 0.1 || denominatorRange.min * 0.5 || 1;
    const x = d3
      .scaleLinear()
      .domain([Math.max(0, denominatorRange.min - xPad), denominatorRange.max + xPad])
      .nice()
      .range([0, innerW]);

    const allRates = units.map((u) => u.rate);
    const allLimits = curve.flatMap((c) => [c.ucl, c.lcl]).filter(isFinite);
    const yMax = Math.max(pooledRate * scale, ...allRates.map((r) => r * scale), ...allLimits.map((v) => v * scale));
    const yMin = Math.min(0, ...allRates.map((r) => r * scale), ...allLimits.map((v) => v * scale));

    const y = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([innerH, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(() => ''))
      .call((gg) => gg.select('.domain').remove())
      .call((gg) => gg.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3'));

    // Funnel shaded band
    const areaGen = d3
      .area<{ n: number; ucl: number; lcl: number }>()
      .x((d) => x(d.n))
      .y0((d) => y(d.lcl * scale))
      .y1((d) => y(d.ucl * scale))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(curve)
      .attr('fill', '#005EB8')
      .attr('fill-opacity', 0.06)
      .attr('d', areaGen);

    // UCL line
    const lineGen = d3
      .line<{ n: number; v: number }>()
      .x((d) => x(d.n))
      .y((d) => y(d.v))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(curve.map((c) => ({ n: c.n, v: c.ucl * scale })))
      .attr('fill', 'none')
      .attr('stroke', '#005EB8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('d', lineGen);

    // LCL line
    g.append('path')
      .datum(curve.map((c) => ({ n: c.n, v: c.lcl * scale })))
      .attr('fill', 'none')
      .attr('stroke', '#005EB8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('d', lineGen);

    // Pooled rate centre line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y(pooledRate * scale))
      .attr('y2', y(pooledRate * scale))
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('x', innerW - 3)
      .attr('y', y(pooledRate * scale) - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('fill', '#374151')
      .text(`Mean ${fmt(pooledRate)}`);

    // Unit dots
    units.forEach((u) => {
      const cx = x(u.denominator);
      const cy = y(u.rate * scale);
      const dotColor = u.signal === 'high' ? '#d5281b' : u.signal === 'low' ? '#007f3b' : color;
      const isOutlier = u.signal !== null;

      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isOutlier ? 5 : 4)
        .attr('fill', dotColor)
        .attr('stroke', isOutlier ? dotColor : '#fff')
        .attr('stroke-width', isOutlier ? 1.5 : 1);

      if (isOutlier) {
        const textY = u.signal === 'high' ? cy - 8 : cy + 14;
        g.append('text')
          .attr('x', cx)
          .attr('y', textY)
          .attr('text-anchor', 'middle')
          .attr('font-size', 9)
          .attr('font-weight', '600')
          .attr('fill', dotColor)
          .text(u.name.length > 18 ? u.name.slice(0, 17) + '…' : u.name);
      }
    });

    // Axes
    const xAxis = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
    xAxis.select('.domain').attr('stroke', '#d1d5db');
    xAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');

    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat((v) => asPercentage ? `${v}%` : String(v)));
    yAxis.select('.domain').attr('stroke', '#d1d5db');
    yAxis.selectAll('text').attr('font-size', 12).attr('fill', '#6b7280');

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + mb - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#9ca3af')
      .text('Volume (denominator)');

    if (yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -ml + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#9ca3af')
        .text(yLabel);
    }

    // Legend
    const legendY = innerH + mb - 22;
    const items = [
      { label: 'Within limits', color },
      { label: 'Above UCL', color: '#d5281b' },
      { label: 'Below LCL', color: '#007f3b' },
    ];
    items.forEach((item, i) => {
      const lx = i * 100;
      g.append('circle').attr('cx', lx + 4).attr('cy', legendY).attr('r', 4).attr('fill', item.color);
      g.append('text').attr('x', lx + 12).attr('y', legendY + 4).attr('font-size', 11).attr('fill', '#6b7280').text(item.label);
    });
  }, [analysis, title, yLabel, asPercentage, color, width, height, fontFamily]);

  return <svg ref={svgRef} />;
}
