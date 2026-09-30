'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, type SankeyGraph, type SankeyNode, type SankeyLink as D3SankeyLink } from 'd3-sankey';

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface DashSankeyChartProps {
  links: SankeyLink[];
  title: string;
  width: number;
  height: number;
  fontFamily: string;
  colors: string[];
}

type NodeDatum = { name: string };
type LinkDatum = { value: number };

export default function DashSankeyChart({
  links,
  title,
  width,
  height,
  fontFamily,
  colors,
}: DashSankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const validLinks = links.filter((l) => l.value > 0 && l.source && l.target);

    if (validLinks.length === 0) {
      svg
        .attr('width', width)
        .attr('height', height)
        .attr('font-family', fontFamily || 'Arial')
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('fill', '#9ca3af')
        .text('No data');
      return;
    }

    const mt = title ? 30 : 10;
    const mb = 10;
    const ml = 90;
    const mr = 90;

    const nameSet = new Set<string>();
    for (const l of validLinks) {
      nameSet.add(l.source);
      nameSet.add(l.target);
    }
    const nodeNames = Array.from(nameSet);

    if (nodeNames.length === 0) return;

    const indexByName = new Map<string, number>(nodeNames.map((n, i) => [n, i]));

    const graphNodes: NodeDatum[] = nodeNames.map((name) => ({ name }));
    const graphLinks: (LinkDatum & { source: number; target: number })[] = validLinks.map((l) => ({
      source: indexByName.get(l.source)!,
      target: indexByName.get(l.target)!,
      value: l.value,
    }));

    const palette = colors.length
      ? colors
      : ['#003087', '#005EB8', '#41B6E6', '#007f3b', '#d5281b', '#768692'];
    const colorScale = d3.scaleOrdinal<string>().domain(nodeNames).range(palette);

    const sankeyGen = d3Sankey<NodeDatum, LinkDatum>()
      .nodeWidth(16)
      .nodePadding(10)
      .extent([
        [ml, mt],
        [width - mr, height - mb],
      ]);

    const graph = sankeyGen({
      nodes: graphNodes.map((d) => ({ ...d })),
      links: graphLinks.map((d) => ({ ...d })),
    }) as SankeyGraph<NodeDatum, LinkDatum>;

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', fontFamily || 'Arial');

    const linkPath = sankeyLinkHorizontal();

    svg
      .append('g')
      .selectAll('path')
      .data(graph.links)
      .enter()
      .append('path')
      .attr('d', (d) => linkPath(d as Parameters<typeof linkPath>[0]) ?? '')
      .attr('fill', (d) => {
        const sourceNode = d.source as SankeyNode<NodeDatum, LinkDatum>;
        return colorScale(sourceNode.name);
      })
      .attr('opacity', 0.3)
      .attr('stroke', 'none')
      .attr('stroke-width', 0);

    svg
      .append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .enter()
      .append('rect')
      .attr('x', (d) => (d as SankeyNode<NodeDatum, LinkDatum>).x0 ?? 0)
      .attr('y', (d) => (d as SankeyNode<NodeDatum, LinkDatum>).y0 ?? 0)
      .attr('width', (d) => {
        const n = d as SankeyNode<NodeDatum, LinkDatum>;
        return (n.x1 ?? 0) - (n.x0 ?? 0);
      })
      .attr('height', (d) => {
        const n = d as SankeyNode<NodeDatum, LinkDatum>;
        return Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0));
      })
      .attr('fill', (d) => colorScale((d as SankeyNode<NodeDatum, LinkDatum>).name))
      .attr('stroke', 'none');

    const labelG = svg.append('g').attr('font-size', 11).attr('fill', '#111827');

    for (const node of graph.nodes) {
      const n = node as SankeyNode<NodeDatum, LinkDatum>;
      const x0 = n.x0 ?? 0;
      const x1 = n.x1 ?? 0;
      const y0 = n.y0 ?? 0;
      const y1 = n.y1 ?? 0;
      const cy = (y0 + y1) / 2;
      const isLeft = x0 < width / 2;
      labelG
        .append('text')
        .attr('x', isLeft ? x0 : x1)
        .attr('y', cy)
        .attr('dy', '0.35em')
        .attr('text-anchor', isLeft ? 'end' : 'start')
        .attr('dx', isLeft ? -6 : 22)
        .text(n.name);
    }

    const linkValueG = svg.append('g').attr('font-size', 10).attr('fill', '#374151').attr('pointer-events', 'none');

    for (const link of graph.links) {
      const l = link as D3SankeyLink<NodeDatum, LinkDatum> & { width?: number; y0?: number; y1?: number };
      const linkWidth = l.width ?? 0;
      if (linkWidth < 14) continue;
      const sourceNode = l.source as SankeyNode<NodeDatum, LinkDatum>;
      const targetNode = l.target as SankeyNode<NodeDatum, LinkDatum>;
      const x = ((sourceNode.x1 ?? 0) + (targetNode.x0 ?? 0)) / 2;
      const y = ((l.y0 ?? 0) + (l.y1 ?? 0)) / 2;
      linkValueG
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .text(typeof l.value === 'number' ? l.value.toLocaleString() : '');
    }

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', '600')
        .attr('fill', '#111827')
        .text(title);
    }
  }, [links, title, width, height, fontFamily, colors]);

  return <svg ref={svgRef} />;
}
