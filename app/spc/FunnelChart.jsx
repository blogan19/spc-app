'use client'
// Funnel chart: scatter of units against denominator with smooth 3σ
// control limits that widen at small n. The visual analogue of MDC's
// "Compliments per 1,000 bed days" funnel in Strengthening Your Decisions.

import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { analyseFunnel } from '@/lib/spc';

const LEFT_AXIS_PAD = 60;
const RIGHT_AXIS_PAD = 40;
const TOP_PAD = 50;
const BOTTOM_PAD = 60;

const FunnelChart = ({ params }) => {
  const svgRef = useRef();

  const {
    data = [],
    width,
    height,
    title,
    titleSize,
    xAxisLabel,
    yAxisLabel,
    lineColor,
    lineWidth,
    confColor,
    confWidth,
    defaultPointColor,
    outlierColor,
    outlierStatus = true,
  } = params;

  const analysis = useMemo(() => {
    const units = data
      .filter((d) => d?.date && d?.value !== '' && d?.value != null)
      .map((d) => ({
        name: d.date,
        numerator: Number(d.value),
        denominator: Number(d.denominator || 0),
      }))
      .filter((u) => Number.isFinite(u.numerator) && Number.isFinite(u.denominator));
    return analyseFunnel(units);
  }, [data]);

  useEffect(() => {
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'white');

    if (analysis.units.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '13px')
        .text('Enter at least one unit with a positive denominator.');
      return;
    }

    const { units, pooledRate, curve, denominatorRange } = analysis;

    const xMin = Math.max(1, denominatorRange.min * 0.9);
    const xMax = denominatorRange.max * 1.05;

    const yMax = Math.min(
      1,
      Math.max(
        d3.max(units, (u) => u.rate) ?? 0,
        d3.max(curve, (c) => c.ucl) ?? 0,
        pooledRate,
      ) * 1.1,
    );
    const yMin = Math.max(
      0,
      Math.min(
        d3.min(units, (u) => u.rate) ?? 0,
        d3.min(curve, (c) => c.lcl) ?? 0,
        pooledRate,
      ) * 0.9,
    );

    const x = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .range([LEFT_AXIS_PAD, width - RIGHT_AXIS_PAD])
      .nice();
    const y = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([height - BOTTOM_PAD, TOP_PAD])
      .nice();

    // Funnel curves drawn as smooth paths.
    const uclLine = d3
      .line()
      .x((d) => x(d.n))
      .y((d) => y(d.ucl))
      .curve(d3.curveMonotoneX);
    const lclLine = d3
      .line()
      .x((d) => x(d.n))
      .y((d) => y(d.lcl))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(curve)
      .attr('fill', 'none')
      .attr('stroke', confColor)
      .attr('stroke-width', confWidth)
      .style('stroke-dasharray', '4, 4')
      .attr('d', uclLine);
    svg
      .append('path')
      .datum(curve)
      .attr('fill', 'none')
      .attr('stroke', confColor)
      .attr('stroke-width', confWidth)
      .style('stroke-dasharray', '4, 4')
      .attr('d', lclLine);

    // Pooled-rate centre line.
    svg
      .append('line')
      .attr('x1', LEFT_AXIS_PAD)
      .attr('x2', width - RIGHT_AXIS_PAD)
      .attr('y1', y(pooledRate))
      .attr('y2', y(pooledRate))
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);
    svg
      .append('text')
      .attr('x', width - RIGHT_AXIS_PAD - 4)
      .attr('y', y(pooledRate) - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('fill', lineColor)
      .text(`Pooled rate: ${(pooledRate * 100).toFixed(1)}%`);

    // Unit scatter points.
    svg
      .append('g')
      .selectAll('circle')
      .data(units)
      .enter()
      .append('circle')
      .attr('cx', (u) => x(u.denominator))
      .attr('cy', (u) => y(u.rate))
      .attr('r', 5)
      .attr('fill', (u) =>
        outlierStatus && u.signal !== null ? outlierColor : defaultPointColor,
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Unit labels, offset above the point.
    svg
      .append('g')
      .selectAll('text.unit-label')
      .data(units)
      .enter()
      .append('text')
      .attr('x', (u) => x(u.denominator))
      .attr('y', (u) => y(u.rate) - 9)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text((u) => u.name);

    // Axes.
    svg
      .append('g')
      .attr('transform', `translate(0,${height - BOTTOM_PAD})`)
      .call(d3.axisBottom(x).ticks(6));
    svg
      .append('g')
      .attr('transform', `translate(${LEFT_AXIS_PAD},0)`)
      .call(d3.axisLeft(y).tickFormat((v) => `${(v * 100).toFixed(0)}%`));

    // Titles and axis labels.
    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', TOP_PAD / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${titleSize}px`)
        .text(title);
    }
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height - 12)
      .attr('font-size', '11px')
      .text(xAxisLabel || 'Denominator (sample size)');
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('x', -height / 2)
      .attr('transform', 'rotate(-90)')
      .attr('font-size', '11px')
      .text(yAxisLabel || 'Rate');
  }, [
    analysis,
    width,
    height,
    title,
    titleSize,
    xAxisLabel,
    yAxisLabel,
    lineColor,
    lineWidth,
    confColor,
    confWidth,
    defaultPointColor,
    outlierColor,
    outlierStatus,
  ]);

  const exportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const safe = (title || 'funnel').replace(/[^a-z0-9\-_]+/gi, '_');
        a.href = URL.createObjectURL(blob);
        a.download = `${safe}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  };

  const flagged = analysis.units.filter((u) => u.signal !== null);
  const summary =
    analysis.units.length > 0
      ? flagged.length === 0
        ? `${analysis.units.length} units — none outside the funnel (all consistent with common-cause variation around ${(analysis.pooledRate * 100).toFixed(1)}%).`
        : `${analysis.units.length} units, ${flagged.length} outside the funnel: ${flagged
            .map((u) => `${u.name} (${u.signal === 'high' ? 'high' : 'low'})`)
            .join(', ')}.`
      : null;

  return (
    <div>
      {summary && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-medium">Summary:</span> {summary}
        </p>
      )}
      <svg ref={svgRef} className="block m-auto" />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={exportPng}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
};

export default FunnelChart;
