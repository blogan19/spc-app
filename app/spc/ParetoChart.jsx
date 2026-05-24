'use client'
// Pareto chart: descending bars with a cumulative-% line on the right
// axis, plus a horizontal reference at the vital-few threshold (80%).
// Built directly on D3 so it can share PNG export with the SPC chart
// while not pretending to be a time-series.

import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { analysePareto } from '@/lib/spc';

const LEFT_AXIS_PAD = 60;
const RIGHT_AXIS_PAD = 60;
const TOP_PAD = 50;
const BOTTOM_PAD = 100;

const ParetoChart = ({ params }) => {
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
    defaultPointColor,
    outlierColor,
    outlierStatus = true,
  } = params;

  const analysis = useMemo(() => {
    const categories = data
      .filter((d) => d?.date && d?.value !== '' && d?.value != null)
      .map((d) => ({ name: d.date, count: Number(d.value) }))
      .filter((c) => Number.isFinite(c.count));
    return analysePareto(categories);
  }, [data]);

  useEffect(() => {
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'white');

    if (analysis.categories.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '13px')
        .text('Enter at least one category with a positive count.');
      return;
    }

    const { categories, vitalFewThreshold, vitalFewCount } = analysis;

    const x = d3
      .scaleBand()
      .domain(categories.map((c) => c.name))
      .range([LEFT_AXIS_PAD, width - RIGHT_AXIS_PAD])
      .padding(0.2);

    const yLeft = d3
      .scaleLinear()
      .domain([0, d3.max(categories, (c) => c.count) ?? 0])
      .nice()
      .range([height - BOTTOM_PAD, TOP_PAD]);

    const yRight = d3
      .scaleLinear()
      .domain([0, 100])
      .range([height - BOTTOM_PAD, TOP_PAD]);

    // Bars — categories within the vital few get the highlight colour
    // when the highlight option is on.
    svg
      .append('g')
      .selectAll('rect')
      .data(categories)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.name))
      .attr('y', (d) => yLeft(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - BOTTOM_PAD - yLeft(d.count))
      .attr('fill', (_d, i) =>
        outlierStatus && i < vitalFewCount ? outlierColor : defaultPointColor,
      );

    // Bar value labels.
    svg
      .append('g')
      .selectAll('text.bar-label')
      .data(categories)
      .enter()
      .append('text')
      .attr('x', (d) => x(d.name) + x.bandwidth() / 2)
      .attr('y', (d) => yLeft(d.count) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .text((d) => d.count);

    // Cumulative-% line.
    const line = d3
      .line()
      .x((d) => x(d.name) + x.bandwidth() / 2)
      .y((d) => yRight(d.cumulativePercentage));
    svg
      .append('path')
      .datum(categories)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth)
      .attr('d', line);
    svg
      .append('g')
      .selectAll('circle')
      .data(categories)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.name) + x.bandwidth() / 2)
      .attr('cy', (d) => yRight(d.cumulativePercentage))
      .attr('r', 3)
      .attr('fill', lineColor);

    // Threshold line at 80% (or configured threshold).
    const thresholdY = yRight(vitalFewThreshold);
    svg
      .append('line')
      .attr('x1', LEFT_AXIS_PAD)
      .attr('x2', width - RIGHT_AXIS_PAD)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1)
      .style('stroke-dasharray', '6, 4');
    svg
      .append('text')
      .attr('x', width - RIGHT_AXIS_PAD - 4)
      .attr('y', thresholdY - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text(`${vitalFewThreshold}% threshold`);

    // X axis with rotated category labels.
    svg
      .append('g')
      .attr('transform', `translate(0,${height - BOTTOM_PAD})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-35)');

    svg
      .append('g')
      .attr('transform', `translate(${LEFT_AXIS_PAD},0)`)
      .call(d3.axisLeft(yLeft));
    svg
      .append('g')
      .attr('transform', `translate(${width - RIGHT_AXIS_PAD},0)`)
      .call(d3.axisRight(yRight).tickFormat((d) => `${d}%`));

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', TOP_PAD / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${titleSize}px`)
        .text(title);
    }

    if (xAxisLabel) {
      svg
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .text(xAxisLabel);
    }

    if (yAxisLabel) {
      svg
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 14)
        .attr('x', -height / 2)
        .attr('transform', 'rotate(-90)')
        .text(yAxisLabel);
    }

    // Right axis label.
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', width - 14)
      .attr('x', height / 2)
      .attr('transform', 'rotate(90)')
      .attr('fill', '#6b7280')
      .attr('font-size', '11px')
      .text('Cumulative %');
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
        const safe = (title || 'pareto').replace(/[^a-z0-9\-_]+/gi, '_');
        a.href = URL.createObjectURL(blob);
        a.download = `${safe}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  };

  const summaryLine =
    analysis.categories.length > 0
      ? `Vital few: ${analysis.vitalFewCount} of ${analysis.categories.length} categories ` +
        `(${analysis.vitalFewThreshold}% threshold). Total = ${analysis.total}.`
      : null;

  return (
    <div>
      {summaryLine && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-medium">Summary:</span> {summaryLine}
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

export default ParetoChart;
