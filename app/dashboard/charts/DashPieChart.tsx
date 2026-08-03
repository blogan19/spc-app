'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DashPieChartProps {
  slices: { label: string; value: number }[];  // already sorted/grouped, ready to render
  title: string;
  labelKind: 'percentage' | 'value' | 'both' | 'none';
  innerRadius: number;   // 0=pie, 0.5=donut (fraction of outerRadius)
  colors: string[];
  width: number;
  height: number;
  fontFamily: string;
  onSliceClick?: (label: string) => void;
}

const LEGEND_W = 140;
const MAX_LABEL_CHARS = 16;

export default function DashPieChart({
  slices,
  title,
  labelKind,
  innerRadius,
  colors,
  width,
  height,
  fontFamily,
  onSliceClick,
}: DashPieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (slices.length === 0) return;

    const mt = title ? 36 : 12;
    const mb = 12;
    const ml = 12;
    const mr = LEGEND_W;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial');

    // Title
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

    const outerRadius = Math.min(innerW, innerH) / 2;
    if (outerRadius < 8) return;

    const innerR = outerRadius * Math.max(0, Math.min(1, innerRadius));
    const cx = ml + innerW / 2;
    const cy = mt + innerH / 2;

    const total = d3.sum(slices, (d) => d.value);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(slices.map((d) => d.label))
      .range(colors.length > 0 ? colors : d3.schemeTableau10);

    const pie = d3
      .pie<{ label: string; value: number }>()
      .value((d) => d.value)
      .sort(null);

    const arcData = pie(slices);

    const arcGen = d3
      .arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(innerR)
      .outerRadius(outerRadius);

    // Label arc — slightly larger for centroid positioning
    const labelArc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(outerRadius * 0.65)
      .outerRadius(outerRadius * 0.65);

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Slices
    g.selectAll('.slice')
      .data(arcData)
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('d', arcGen)
      .attr('fill', (d) => colorScale(d.data.label))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', onSliceClick ? 'pointer' : 'default')
      .on('click', onSliceClick ? (event, d) => {
        event.stopPropagation();
        onSliceClick(d.data.label);
      } : null);

    // Labels — skip slices < 5% of total
    if (labelKind !== 'none' && total > 0) {
      g.selectAll('.slice-label')
        .data(arcData.filter((d) => d.data.value / total >= 0.05))
        .enter()
        .append('text')
        .attr('class', 'slice-label')
        .attr('transform', (d) => {
          const [lx, ly] = labelArc.centroid(d);
          return `translate(${lx},${ly})`;
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', Math.min(11, outerRadius * 0.18))
        .attr('fill', '#fff')
        .attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text((d) => {
          const pct = ((d.data.value / total) * 100).toFixed(1) + '%';
          const val = d.data.value.toLocaleString();
          if (labelKind === 'percentage') return pct;
          if (labelKind === 'value') return val;
          // both
          return `${pct}\n${val}`;
        });

      // For 'both', split into two tspan lines
      if (labelKind === 'both') {
        g.selectAll('.slice-label').each(function (d) {
          const datum = d as d3.PieArcDatum<{ label: string; value: number }>;
          const node = d3.select(this);
          const pct = ((datum.data.value / total) * 100).toFixed(1) + '%';
          const val = datum.data.value.toLocaleString();
          node.text('');
          node.append('tspan')
            .attr('x', 0)
            .attr('dy', '-0.5em')
            .text(pct);
          node.append('tspan')
            .attr('x', 0)
            .attr('dy', '1.1em')
            .text(val);
        });
      }
    }

    // Legend (right side)
    const legendX = ml + innerW + 10;
    const legendTop = mt + 8;
    const swatchSize = 10;
    const rowH = 18;

    const legendG = svg.append('g').attr('transform', `translate(${legendX},${legendTop})`);

    slices.forEach((slice, i) => {
      const rowY = i * rowH;
      legendG
        .append('rect')
        .attr('x', 0)
        .attr('y', rowY)
        .attr('width', swatchSize)
        .attr('height', swatchSize)
        .attr('rx', 2)
        .attr('fill', colorScale(slice.label));

      const truncated =
        slice.label.length > MAX_LABEL_CHARS
          ? slice.label.slice(0, MAX_LABEL_CHARS - 1) + '…'
          : slice.label;

      legendG
        .append('text')
        .attr('x', swatchSize + 5)
        .attr('y', rowY + swatchSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', 10)
        .attr('fill', '#374151')
        .text(truncated);
    });
  }, [slices, title, labelKind, innerRadius, colors, width, height, fontFamily, onSliceClick]);

  return <svg ref={svgRef} />;
}
