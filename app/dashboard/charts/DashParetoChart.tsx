'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ParetoAnalysis } from '@/lib/spc/pareto';

interface DashParetoChartProps {
  analysis: ParetoAnalysis;
  title: string;
  yLabel: string;
  showPercentage: boolean;
  width: number;
  height: number;
  color: string;
  fontFamily: string;
  onBarClick?: (categoryName: string) => void;
}

export default function DashParetoChart({
  analysis,
  title,
  yLabel,
  showPercentage,
  width,
  height,
  color,
  fontFamily,
  onBarClick,
}: DashParetoChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { categories, total, vitalFewCount } = analysis;
    if (categories.length === 0) return;

    const mt = title ? 36 : 12;
    const mb = 60;
    const ml = 52;
    const mr = 48; // space for right y-axis

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial')
      .append('g')
      .attr('transform', `translate(${ml},${mt})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(categories.map((c) => c.name))
      .range([0, innerW])
      .padding(0.2);

    const barMax = showPercentage
      ? 100
      : Math.max(...categories.map((c) => c.count));

    const yLeft = d3.scaleLinear().domain([0, barMax]).nice().range([innerH, 0]);
    const yRight = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    // Bars
    g.selectAll('.bar')
      .data(categories)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.name) ?? 0)
      .attr('y', (d) => yLeft(showPercentage ? d.percentage : d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerH - yLeft(showPercentage ? d.percentage : d.count))
      .attr('fill', (_, i) => (i < vitalFewCount ? color : '#d1d5db'))
      .attr('rx', 2)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', onBarClick ? (event, d) => {
        event.stopPropagation();
        onBarClick(d.name);
      } : null);

    // Cumulative line
    const lineData = categories.map((c, i) => ({
      x: (xScale(c.name) ?? 0) + xScale.bandwidth() / 2,
      y: yRight(c.cumulativePercentage),
      isVital: i < vitalFewCount,
    }));

    const lineGen = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5)
      .attr('d', lineGen);

    // Cumulative dots
    g.selectAll('.cum-dot')
      .data(lineData)
      .enter()
      .append('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 3)
      .attr('fill', '#374151');

    // 80% threshold line
    const y80 = yRight(analysis.vitalFewThreshold);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y80)
      .attr('y2', y80)
      .attr('stroke', '#d97706')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', innerW - 2)
      .attr('y', y80 - 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#d97706')
      .attr('font-size', 9)
      .text(`${analysis.vitalFewThreshold}%`);

    // Left y-axis
    const yLeftAxis = d3
      .axisLeft(yLeft)
      .ticks(5)
      .tickFormat((v) => (showPercentage ? `${v}%` : String(v)));

    g.append('g')
      .call(yLeftAxis)
      .attr('font-size', 12)
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#e5e7eb'));

    // Right y-axis
    const yRightAxis = d3
      .axisRight(yRight)
      .ticks(5)
      .tickFormat((v) => `${v}%`);

    g.append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(yRightAxis)
      .attr('font-size', 12)
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('.tick line').remove());

    // X-axis
    const maxLabelLen = 10;
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .attr('font-size', 11)
      .call((ax) => ax.select('.domain').attr('stroke', '#e5e7eb'))
      .selectAll('.tick text')
      .text((d) => {
        const s = String(d);
        return s.length > maxLabelLen ? s.slice(0, maxLabelLen - 1) + '…' : s;
      })
      .attr('dy', '1em')
      .style('text-anchor', 'middle');

    // Y-label (left)
    if (yLabel || showPercentage) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -ml + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#6b7280')
        .text(yLabel || (showPercentage ? 'Percentage' : 'Count'));
    }

    // Vital-few annotation
    if (vitalFewCount > 0 && vitalFewCount < categories.length) {
      const vitalX = (xScale(categories[vitalFewCount - 1].name) ?? 0) + xScale.bandwidth();
      g.append('line')
        .attr('x1', vitalX)
        .attr('x2', vitalX)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }

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

    // Total label
    if (total > 0) {
      svg
        .append('text')
        .attr('x', ml + innerW / 2)
        .attr('y', height - 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('fill', '#9ca3af')
        .text(`Total: ${total.toLocaleString()} · Vital few: ${vitalFewCount} categor${vitalFewCount === 1 ? 'y' : 'ies'} = ${analysis.vitalFewThreshold}%`);
    }
  }, [analysis, title, yLabel, showPercentage, width, height, color, fontFamily, onBarClick]);

  return <svg ref={svgRef} />;
}
