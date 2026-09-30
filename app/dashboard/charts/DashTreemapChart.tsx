'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface TreemapNode {
  label: string;
  value: number;
  group?: string;
}

interface DashTreemapChartProps {
  data: TreemapNode[];
  title: string;
  width: number;
  height: number;
  fontFamily: string;
  colors: string[];
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function textColor(bg: string): string {
  try {
    return luminance(bg) > 0.179 ? '#111827' : '#ffffff';
  } catch {
    return '#111827';
  }
}

export default function DashTreemapChart({
  data,
  title,
  width,
  height,
  fontFamily,
  colors,
}: DashTreemapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!data || data.length === 0) return;

    const mt = title ? 30 : 8;
    const mb = 8;
    const ml = 4;
    const mr = 4;

    const innerW = Math.max(0, width - ml - mr);
    const innerH = Math.max(0, height - mt - mb);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial');

    const palette = colors.length
      ? colors
      : ['#003087', '#005EB8', '#41B6E6', '#007f3b', '#d5281b'];

    const hasGroups = data.some((d) => !!d.group);

    type RawLeaf = { name: string; value: number };
    type RawGroup = { name: string; children: RawLeaf[] };
    type RawRoot = { name: string; children: (RawLeaf | RawGroup)[] };

    let rootData: RawRoot;

    if (hasGroups) {
      const groupMap = new Map<string, RawLeaf[]>();
      for (const node of data) {
        const g = node.group ?? '(Other)';
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g)!.push({ name: node.label, value: node.value });
      }
      rootData = {
        name: 'root',
        children: Array.from(groupMap.entries()).map(([name, children]) => ({
          name,
          children,
        })),
      };
    } else {
      rootData = {
        name: 'root',
        children: data.map((d) => ({ name: d.label, value: d.value })),
      };
    }

    const hier = d3
      .hierarchy<RawRoot | RawGroup | RawLeaf>(rootData as RawRoot)
      .sum((d) => ('value' in d && typeof d.value === 'number' ? d.value : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<RawRoot | RawGroup | RawLeaf>()
      .size([innerW, innerH])
      .paddingOuter(2)
      .paddingInner(1)(hier);

    const colorKeys = hasGroups
      ? Array.from(
          new Set(data.map((d) => d.group ?? '(Other)'))
        )
      : data.map((d) => d.label);

    const colorScale = d3
      .scaleOrdinal<string, string>()
      .domain(colorKeys)
      .range(palette);

    type D3Node = d3.HierarchyRectangularNode<RawRoot | RawGroup | RawLeaf>;

    const leaves = (hier as D3Node).leaves();

    const clipId = (i: number) => `tm-clip-${i}`;

    leaves.forEach((leaf, i) => {
      const x0 = leaf.x0;
      const y0 = leaf.y0;
      const x1 = leaf.x1;
      const y1 = leaf.y1;
      const w = x1 - x0;
      const h = y1 - y0;

      const colorKey = hasGroups
        ? ((leaf.parent?.data as { name: string }).name ?? '')
        : (leaf.data as { name: string }).name;
      const fill = colorScale(colorKey);
      const fg = textColor(fill);

      const g = svg
        .append('g')
        .attr('transform', `translate(${ml + x0},${mt + y0})`);

      g.append('rect')
        .attr('width', w)
        .attr('height', h)
        .attr('fill', fill)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('rx', 2);

      if (w > 40 && h > 24) {
        svg
          .append('defs')
          .append('clipPath')
          .attr('id', clipId(i))
          .append('rect')
          .attr('x', ml + x0 + 3)
          .attr('y', mt + y0 + 2)
          .attr('width', Math.max(0, w - 6))
          .attr('height', Math.max(0, h - 4));

        const labelText = (leaf.data as { name: string }).name;
        const valueText = String((leaf.value ?? 0).toLocaleString());

        const textG = svg
          .append('g')
          .attr('clip-path', `url(#${clipId(i)})`);

        textG
          .append('text')
          .attr('x', ml + x0 + 4)
          .attr('y', mt + y0 + 13)
          .attr('font-size', 11)
          .attr('fill', fg)
          .text(labelText);

        if (h > 38) {
          textG
            .append('text')
            .attr('x', ml + x0 + 4)
            .attr('y', mt + y0 + 25)
            .attr('font-size', 10)
            .attr('font-weight', '600')
            .attr('fill', fg)
            .text(valueText);
        }
      }
    });

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
  }, [data, title, width, height, fontFamily, colors]);

  return <svg ref={svgRef} />;
}
