'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DashGaugeChartProps {
  label: string;
  value: number | null;
  minValue: number;
  maxValue: number;
  unit: string;
  greenThreshold: number;
  amberThreshold: number;
  higherIsBetter: boolean;
  width: number;
  height: number;
  fontFamily: string;
}

export default function DashGaugeChart({
  label,
  value,
  minValue,
  maxValue,
  unit,
  greenThreshold,
  amberThreshold,
  higherIsBetter,
  width,
  height,
  fontFamily,
}: DashGaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial');

    const cx = width / 2;
    const cy = height * 0.62;
    const radius = Math.min(width * 0.42, height * 0.78);
    const innerR = radius * 0.58;

    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;

    const range = maxValue - minValue || 1;
    const valueToAngle = (v: number) =>
      -Math.PI / 2 + (Math.PI * (v - minValue)) / range;

    const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerR)
      .outerRadius(radius)
      .startAngle((d) => d.startAngle)
      .endAngle((d) => d.endAngle);

    const makePath = (a1: number, a2: number) =>
      arcGen({ startAngle: a1, endAngle: a2 });

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Background arc
    g.append('path')
      .attr('d', makePath(startAngle, endAngle)!)
      .attr('fill', '#e5e7eb');

    // Coloured segments
    type Segment = { a1: number; a2: number; colour: string };
    const aAmber = valueToAngle(amberThreshold);
    const aGreen = valueToAngle(greenThreshold);

    const segments: Segment[] = higherIsBetter
      ? [
          { a1: startAngle, a2: aAmber, colour: '#d5281b' },
          { a1: aAmber, a2: aGreen, colour: '#f59e0b' },
          { a1: aGreen, a2: endAngle, colour: '#007f3b' },
        ]
      : [
          { a1: startAngle, a2: aAmber, colour: '#007f3b' },
          { a1: aAmber, a2: aGreen, colour: '#f59e0b' },
          { a1: aGreen, a2: endAngle, colour: '#d5281b' },
        ];

    for (const seg of segments) {
      const c1 = Math.max(startAngle, Math.min(endAngle, seg.a1));
      const c2 = Math.max(startAngle, Math.min(endAngle, seg.a2));
      if (c2 <= c1) continue;
      g.append('path')
        .attr('d', makePath(c1, c2)!)
        .attr('fill', seg.colour);
    }

    // Needle
    if (value !== null) {
      const clampedVal = Math.max(minValue, Math.min(maxValue, value));
      const angle = valueToAngle(clampedVal);
      const needleLen = radius * 0.88;

      g.append('g')
        .attr('transform', `rotate(${(angle * 180) / Math.PI})`)
        .append('path')
        .attr('d', `M -4 0 L 4 0 L 0 ${-needleLen} Z`)
        .attr('fill', '#1e293b');

      g.append('circle').attr('r', 5).attr('fill', '#1e293b');
    }

    // Value text
    svg
      .append('text')
      .attr('x', cx)
      .attr('y', cy + radius * 0.15)
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(16, radius * 0.28))
      .attr('font-weight', '700')
      .attr('fill', '#111827')
      .text(value !== null ? value.toLocaleString() + unit : '—');

    // Label text
    svg
      .append('text')
      .attr('x', cx)
      .attr('y', cy + radius * 0.36)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#6b7280')
      .text(label);

    // Min/max tick labels at arc tips
    const midR = innerR + (radius - innerR) / 2;
    svg
      .append('text')
      .attr('x', cx + midR * Math.cos(startAngle) - 4)
      .attr('y', cy + midR * Math.sin(startAngle) + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('fill', '#9ca3af')
      .text(minValue.toLocaleString());

    svg
      .append('text')
      .attr('x', cx + midR * Math.cos(endAngle) + 4)
      .attr('y', cy + midR * Math.sin(endAngle) + 4)
      .attr('text-anchor', 'start')
      .attr('font-size', 10)
      .attr('fill', '#9ca3af')
      .text(maxValue.toLocaleString());
  }, [label, value, minValue, maxValue, unit, greenThreshold, amberThreshold, higherIsBetter, width, height, fontFamily]);

  return <svg ref={svgRef} />;
}
