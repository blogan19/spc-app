'use client'
// SPC chart. The maths lives in lib/spc and is exercised by vitest — this
// component only does presentation. No state, no prop mutation, no
// setState-inside-useEffect loop (P0.6 / P0.7).
import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { analyseSpc, deriveIcons } from "@/lib/spc";
import { nextDateAt } from "@/lib/project/dateRange";

const LineChart = ({ params }) => {
  const svgRef = useRef();

  const {
    data = [],
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    title,
    titleSize,
    description,
    xAxisLabel,
    yAxisLabel,
    axisLabelSize = 12,
    aim = 'increase',
    target,
    chartKind = 'XmR',
    outlierStatus = true,
    lineColor,
    lineWidth,
    medianColor,
    medianWidth,
    confColor,
    confWidth,
    defaultPointColor,
    successColor,
    outlierColor,
    events = [],
    pdsaBands = [],
    onUpdateRowField,
    increment,
    // Visibility toggles — default true so older projects without these
    // fields keep their existing rendering.
    showMean = true,
    showLimits = true,
    showTarget = true,
    centreLineKind = 'mean',
    logoDataUrl = '',
    backgroundColor = '#ffffff',
    showForecast = false,
    forecastPeriods = 6,
    onExportCsv,
  } = params;

  // Inline-annotation popover state. null when no point is being edited.
  // Coordinates are in SVG/container space so the React popover above
  // the SVG can be absolutely positioned next to the clicked point.
  const [editing, setEditing] = useState(null);
  const canEditAnnotations = typeof onUpdateRowField === 'function';

  // Coerce the form's row shape (value as string, recalculate nested in
  // comment) into the maths library's row shape, then analyse. Everything
  // downstream — limits, point colours, rule hits — is derived from this
  // single pure computation. The comment object rides along so on-chart
  // annotations and the reference list can read it without a second pass.
  const analysis = useMemo(() => {
    const kind = ['RunChart', 'P', 'C', 'U'].includes(chartKind) ? chartKind : 'XmR';
    const sourceRows = data
      .filter((d) => d?.date && d?.value !== '' && d?.value != null)
      .map((d) => ({
        date: d.date,
        value: Number(d.value),
        denominator: d?.denominator !== undefined && d?.denominator !== ''
          ? Number(d.denominator)
          : undefined,
        recalculate: Boolean(d?.comment?.recalculate),
        comment: d.comment,
      }))
      .filter((r) => Number.isFinite(r.value));
    const { analysis: a, plottedRows } = analyseSpc(sourceRows, { kind });
    // Re-attach the comment field after the library has produced its
    // plotted rows so on-chart annotations still work in every kind.
    const rowsForRender = plottedRows.map((r, i) => ({ ...r, comment: sourceRows[i].comment }));
    // Derive variation + assurance icons here so the SVG can render them
    // alongside the title — that means the PNG export naturally carries
    // the same board-ready summary the on-screen card used to show.
    const icons = deriveIcons(plottedRows, a, aim, target);
    return {
      rows: rowsForRender,
      segments: a.segments,
      pointLimits: a.pointLimits,
      rules: a.rules,
      kind: a.kind,
      icons,
    };
  }, [data, chartKind, aim, target]);

  // Tick format follows the measure's increment so a monthly chart reads
  // "May-26" rather than "01/05/2026". `increment` is set by the date-setup
  // form on new measures; older measures (or anything not configured) fall
  // back to the original DD/MM/YYYY.
  const xTickFormat =
    increment === 'yearly' ? '%Y'
    : increment === 'monthly' ? '%b-%Y'
    : increment === 'weekly' || increment === 'daily' ? '%d %b'
    : '%d/%m/%Y';

  // Y-axis lower bound: leave headroom below LCL or the smallest value,
  // never go below zero. For Run charts there's no LCL so we just shrink
  // toward the min value with a small margin.
  const yStart = useMemo(() => {
    if (analysis.rows.length === 0) return 0;
    const values = analysis.rows.map((r) => r.value);
    const ymin = d3.min(values);
    if (analysis.kind === 'RunChart') {
      const margin = Math.max(1, (d3.max(values) - ymin) * 0.1);
      const start = ymin - margin;
      return Math.max(0, Math.round(start));
    }
    const firstLimits = analysis.pointLimits[0];
    const ucl = firstLimits?.ucl ?? ymin;
    const lcl = firstLimits?.lcl ?? ymin;
    let start = ymin - (ucl * 1.1 - ymin);
    if (lcl < 0) start = lcl * 1.1;
    if (start < 0) start = 0;
    return Math.round(start);
  }, [analysis]);

  useEffect(() => {
    // viewBox + preserveAspectRatio lets the SVG scale down on narrow
     // viewports while keeping internal coordinates intact. The container
     // div constrains the rendered width; height follows via h-auto.
     const svg = d3
       .select(svgRef.current)
       .attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .attr('width', '100%')
       .attr('height', 'auto');
    svg.selectAll('*').remove();

    // Opaque background so PNG exports aren't transparent. Colour is
    // user-controlled via settings.backgroundColor (random themes also
    // override this).
    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', backgroundColor);

    const { rows, pointLimits, rules } = analysis;
    if (rows.length === 0) return;

    // Map each row to its plottable shape, carrying the limits and any rule hits.
    const parseDate = d3.timeParse('%Y-%m-%d');
    const plotted = rows.map((r, i) => ({
      date: parseDate(r.date),
      value: r.value,
      mean: pointLimits[i].mean,
      // pointLimits.median is populated by all analysis kinds; fall back
      // to mean defensively in case an older cached analysis is around.
      median: pointLimits[i].median ?? pointLimits[i].mean,
      ucl: pointLimits[i].ucl,
      lcl: pointLimits[i].lcl,
      comment: r.comment,
    }));

    // If the forecast band is on, work out the future dates first so
    // the x-domain encompasses them. We step the latest data date
    // forward N times using the same increment that drives the editor's
    // "+ 1 day/week/month" button — keeps the spacing consistent.
    const forecastDates = [];
    if (showForecast && plotted.length > 0 && analysis.segments.length > 0 && forecastPeriods > 0) {
      const lastRow = plotted[plotted.length - 1];
      // plotted.date is a JS Date (parseDate'd). Convert back to ISO for
      // nextDateAt, then back to Date for the scale.
      let cursorISO = `${lastRow.date.getUTCFullYear()}-${String(lastRow.date.getUTCMonth() + 1).padStart(2, '0')}-${String(lastRow.date.getUTCDate()).padStart(2, '0')}`;
      for (let i = 0; i < forecastPeriods; i++) {
        cursorISO = nextDateAt(cursorISO, increment ?? 'daily');
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cursorISO);
        if (!m) break;
        forecastDates.push(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
      }
    }

    const xDomainEnd = forecastDates.length > 0
      ? forecastDates[forecastDates.length - 1]
      : d3.max(plotted, (d) => d.date);
    const xDomainStart = d3.min(plotted, (d) => d.date);

    const x = d3.scaleUtc()
      .domain([xDomainStart, xDomainEnd])
      .range([marginLeft, width - marginRight]);

    const isRunChart = analysis.kind === 'RunChart';
    // Y-axis upper bound: for XmR use UCL; for Run charts use the max data
    // value. The target line, if any, should also be visible.
    const candidates = plotted.map((d) => (isRunChart ? d.value : Math.max(d.value, d.ucl)));
    if (typeof target === 'number' && Number.isFinite(target)) candidates.push(target);
    const yMax = (d3.max(candidates) ?? 0) * 1.05;
    const y = d3.scaleLinear()
      .domain([yStart, yMax])
      .range([height - marginBottom, marginTop])
      .nice();

    const formatDate = d3.timeFormat(xTickFormat);
    svg.append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickValues(plotted.map((d) => d.date)).tickFormat(formatDate))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    svg.append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

    // PDSA cycle bands — coloured stripes spanning the chart vertically
    // for each linked cycle's [startDate, endDate] window. Painted now
    // (after axes, before points/lines) so the points stay legible on
    // top. Bands clipped to the chart's x-domain.
    if (pdsaBands && pdsaBands.length > 0 && plotted.length > 0) {
      const firstDate = plotted[0].date;
      const lastDate = plotted[plotted.length - 1].date;
      // Open cycles (endISO=null) extend to "today" or the chart's right
      // edge, whichever is sooner — going past the right edge would
      // confuse the eye into thinking the cycle continues forever.
      const today = new Date();
      for (const band of pdsaBands) {
        const startParsed = parseDate(band.startISO);
        if (!startParsed) continue;
        const endParsed = band.endISO ? parseDate(band.endISO) : (today < lastDate ? today : lastDate);
        if (!endParsed) continue;
        // Skip bands entirely outside the chart's domain.
        if (endParsed < firstDate || startParsed > lastDate) continue;
        const clippedStart = startParsed < firstDate ? firstDate : startParsed;
        const clippedEnd = endParsed > lastDate ? lastDate : endParsed;
        const bx = x(clippedStart);
        const bw = Math.max(2, x(clippedEnd) - bx);
        const by = marginTop;
        const bh = (height - marginBottom) - marginTop;
        // Native SVG tooltip — hover the band to see the cycle title +
        // window. Cheap to add; helps when bands overlap.
        const tooltip = `${band.label} · ${band.startISO}${band.endISO ? ` → ${band.endISO}` : ' → present'}`;
        const g = svg.append('g');
        g.append('rect')
          .attr('x', bx)
          .attr('y', by)
          .attr('width', bw)
          .attr('height', bh)
          .attr('fill', band.fillColor)
          .attr('fill-opacity', 0.15)
          .attr('stroke', 'none')
          .append('title')
          .text(tooltip);
        // Coloured top border so the band's extent reads clearly even
        // at low fill opacity.
        g.append('line')
          .attr('x1', bx)
          .attr('x2', bx + bw)
          .attr('y1', by)
          .attr('y2', by)
          .attr('stroke', band.borderColor)
          .attr('stroke-width', 2);
        // Label at the top-left inside the band. Truncated to the band's
        // width so we don't overdraw neighbouring bands.
        const padX = 4;
        const charWidth = 5.5;
        const labelText = band.label || 'Cycle';
        const maxChars = Math.max(3, Math.floor((bw - padX * 2) / charWidth));
        const displayLabel =
          labelText.length > maxChars ? labelText.slice(0, maxChars - 1) + '…' : labelText;
        g.append('text')
          .attr('x', bx + padX)
          .attr('y', by + 12)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', band.borderColor)
          .text(displayLabel)
          .append('title')
          .text(tooltip);
      }
    }

    // Point colour interprets the rule hits against the user's aim.
    // A direction run in the aim direction is success (blue/green); anything
    // else flagged by any rule is a concerning outlier.
    const colourFor = (i) => {
      if (!outlierStatus) return defaultPointColor;

      const inSuccessDirection =
        (aim === 'increase' && rules.increasingRun.includes(i)) ||
        (aim === 'decrease' && rules.decreasingRun.includes(i));
      if (inSuccessDirection) return successColor;

      const flaggedAsConcern =
        rules.outsideLimits.includes(i) ||
        rules.runAboveBelowMean.includes(i) ||
        rules.twoOfThreeOuterThird.includes(i) ||
        (aim === 'increase' && rules.decreasingRun.includes(i)) ||
        (aim === 'decrease' && rules.increasingRun.includes(i));
      if (flaggedAsConcern) return outlierColor;

      return defaultPointColor;
    };

    const pointCircles = svg.append('g').selectAll('dot')
      .data(plotted)
      .enter().append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.value))
      .attr('r', 5)
      .style('fill', (_d, i) => colourFor(i));

    // Click handler: open the annotation popover anchored to this point.
    // Only attached when the host supplied a write callback — read-only
    // contexts (e.g. exports, sub-process splits) skip this entirely.
    if (canEditAnnotations) {
      pointCircles
        .style('cursor', 'pointer')
        .on('click', function (_event, d) {
          const i = plotted.indexOf(d);
          if (i < 0) return;
          setEditing({
            rowIndex: i,
            cx: x(d.date),
            cy: y(d.value),
            title: d.comment?.title ?? '',
            text: d.comment?.label ?? '',
            lockedAt: d.comment?.lockedAt ?? null,
          });
        });
    }

    // The data line itself.
    svg.append('path')
      .datum(plotted)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth)
      .attr('d', d3.line()
        .x((d) => x(d.date))
        .y((d) => y(d.value)));

    // Centre line — XmR convention uses the MEAN (P0.2), but the user
    // can flip to MEDIAN via the toggle. The colour prop is still called
    // `medianColor` for backwards compatibility with the form.
    if (showMean) {
      const centreAccessor = centreLineKind === 'median'
        ? (d) => y(d.median ?? d.mean)
        : (d) => y(d.mean);
      svg.append('path')
        .datum(plotted)
        .attr('fill', 'none')
        .attr('stroke', medianColor)
        .attr('stroke-width', medianWidth)
        .style('stroke-dasharray', '3, 3')
        .attr('d', d3.line()
          .x((d) => x(d.date))
          .y(centreAccessor));
    }

    if (!isRunChart && showLimits) {
      // UCL.
      svg.append('path')
        .datum(plotted)
        .attr('fill', 'none')
        .attr('stroke', confColor)
        .attr('stroke-width', confWidth)
        .style('stroke-dasharray', '3, 3')
        .attr('d', d3.line()
          .x((d) => x(d.date))
          .y((d) => y(d.ucl)));

      // LCL.
      svg.append('path')
        .datum(plotted)
        .attr('fill', 'none')
        .attr('stroke', confColor)
        .attr('stroke-width', confWidth)
        .style('stroke-dasharray', '3, 3')
        .attr('d', d3.line()
          .x((d) => x(d.date))
          .y((d) => y(d.lcl)));
    }

    // Forecast band — projects the LATEST segment's mean / UCL / LCL
    // forward by N periods. Anchored at the last data date; drawn with
    // a tinted background so the user sees that they're looking at a
    // projection rather than real data. Skip for run charts (no
    // limits) and for cases where there isn't a finalised segment yet.
    if (
      showForecast &&
      forecastDates.length > 0 &&
      analysis.segments.length > 0 &&
      plotted.length > 0
    ) {
      const lastRow = plotted[plotted.length - 1];
      const lastSeg = analysis.segments[analysis.segments.length - 1];
      const xStart = x(lastRow.date);
      const xEnd = x(forecastDates[forecastDates.length - 1]);
      const yTop = marginTop;
      const yBottom = height - marginBottom;
      // Tinted background indicating projected region.
      svg.append('rect')
        .attr('x', xStart)
        .attr('y', yTop)
        .attr('width', Math.max(0, xEnd - xStart))
        .attr('height', yBottom - yTop)
        .attr('fill', '#0ea5e9')
        .attr('fill-opacity', 0.05);
      // Diagonal divider so the boundary between data and forecast is
      // clear even without a tooltip.
      svg.append('line')
        .attr('x1', xStart)
        .attr('x2', xStart)
        .attr('y1', yTop)
        .attr('y2', yBottom)
        .attr('stroke', '#0ea5e9')
        .attr('stroke-opacity', 0.4)
        .style('stroke-dasharray', '4, 4');
      svg.append('text')
        .attr('x', xStart + 4)
        .attr('y', yTop + 12)
        .attr('font-size', '10px')
        .attr('fill', '#0369a1')
        .attr('opacity', 0.7)
        .text('Forecast →');

      const drawLine = (yValue, dashed) => {
        const line = svg.append('line')
          .attr('x1', xStart)
          .attr('x2', xEnd)
          .attr('y1', y(yValue))
          .attr('y2', y(yValue))
          .attr('stroke', confColor)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', dashed === 'thick' ? medianWidth : confWidth);
        if (dashed) line.style('stroke-dasharray', '6, 4');
        return line;
      };
      if (!isRunChart && showLimits) {
        drawLine(lastSeg.ucl, true);
        drawLine(lastSeg.lcl, true);
      }
      if (showMean) {
        const centre = (params.centreLineKind ?? 'mean') === 'median'
          ? (lastSeg.median ?? lastSeg.mean)
          : lastSeg.mean;
        svg.append('line')
          .attr('x1', xStart)
          .attr('x2', xEnd)
          .attr('y1', y(centre))
          .attr('y2', y(centre))
          .attr('stroke', medianColor)
          .attr('stroke-opacity', 0.7)
          .attr('stroke-width', medianWidth)
          .style('stroke-dasharray', '6, 4');
      }
    }

    // Driver-linked auto-annotations from incidents. Drawn as thin
    // vertical lines clipped to the plot area, with a small label box
    // at the top. Only events within the chart's date range are drawn.
    if (events && events.length > 0 && plotted.length > 0) {
      const firstDate = plotted[0].date;
      const lastDate = plotted[plotted.length - 1].date;
      for (const ev of events) {
        const parsed = parseDate(ev.date);
        if (!parsed || parsed < firstDate || parsed > lastDate) continue;
        const ex = x(parsed);
        svg.append('line')
          .attr('x1', ex)
          .attr('x2', ex)
          .attr('y1', marginTop)
          .attr('y2', height - marginBottom)
          .attr('stroke', '#dc2626')
          .attr('stroke-width', 1)
          .style('stroke-dasharray', '3, 3')
          .attr('opacity', 0.65);
        // Label box at the top
        const labelText = ev.label;
        const padX = 4;
        const charWidth = 5.5;
        const boxW = Math.min(160, labelText.length * charWidth + padX * 2);
        const boxH = 16;
        const boxX = Math.min(
          width - marginRight - boxW,
          Math.max(marginLeft, ex - boxW / 2),
        );
        svg.append('rect')
          .attr('x', boxX)
          .attr('y', marginTop - boxH - 2)
          .attr('width', boxW)
          .attr('height', boxH)
          .attr('rx', 2)
          .attr('fill', '#fef2f2')
          .attr('stroke', '#fecaca');
        svg.append('text')
          .attr('x', boxX + boxW / 2)
          .attr('y', marginTop - 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#991b1b')
          .text(labelText.length > Math.floor(boxW / charWidth) - 1
            ? labelText.slice(0, Math.floor(boxW / charWidth) - 2) + '…'
            : labelText);
      }
    }

    // Target line — drawn as a long-dash green line across the plot. Label
    // sits at the right edge so it doesn't crowd the data.
    if (showTarget && typeof target === 'number' && Number.isFinite(target)) {
      const targetY = y(target);
      svg.append('line')
        .attr('x1', marginLeft)
        .attr('x2', width - marginRight)
        .attr('y1', targetY)
        .attr('y2', targetY)
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 1.5)
        .style('stroke-dasharray', '8, 4');
      svg.append('text')
        .attr('x', width - marginRight - 4)
        .attr('y', targetY - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#2563eb')
        .text(`Target: ${target}`);
    }

    // Comment callouts. For each row whose comment has a title or
    // content, draw a leader line from the point to a white-backed label
    // that shows both. Placed above the point when the point sits in
    // the lower half, below otherwise, so the callout stays inside the
    // chart frame on most data. Native <title> on each callout carries
    // the untruncated text for hover.
    const annotationsLayer = svg.append('g').attr('class', 'annotations');
    plotted.forEach((d) => {
      const titleText = (d.comment?.title || '').trim();
      const content = (d.comment?.label || '').trim();
      if (!titleText && !content) return;

      const cx = x(d.date);
      const cy = y(d.value);
      const placeAbove = cy > height / 2;

      const lineHeight = 13;
      const padX = 6;
      const padY = 4;
      const charWidth = 6.2;
      const gap = 30; // leader length — keeps the box clear of the point
      const MAX_BOX_WIDTH = 220;

      const maxChars = Math.floor((MAX_BOX_WIDTH - padX * 2) / charWidth);
      const truncate = (s) => (s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s);
      const lines = [titleText, content].filter(Boolean).map(truncate);

      const maxLineLen = Math.max(...lines.map((s) => s.length));
      const boxW = Math.min(MAX_BOX_WIDTH, Math.max(48, maxLineLen * charWidth + padX * 2));
      const boxH = lines.length * lineHeight + padY * 2;

      // Clamp horizontally so the box stays inside the plot frame.
      const boxX = Math.min(
        width - marginRight - boxW,
        Math.max(marginLeft, cx - boxW / 2),
      );
      const boxY = placeAbove ? cy - gap - boxH : cy + gap;

      annotationsLayer
        .append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', cx)
        .attr('y2', placeAbove ? boxY + boxH : boxY)
        .attr('stroke', '#555')
        .attr('stroke-width', 0.5);

      annotationsLayer
        .append('rect')
        .attr('x', boxX)
        .attr('y', boxY)
        .attr('width', boxW)
        .attr('height', boxH)
        .attr('rx', 3)
        .attr('fill', 'white')
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.5);

      lines.forEach((line, lineIdx) => {
        annotationsLayer
          .append('text')
          .attr('x', boxX + boxW / 2)
          .attr('y', boxY + padY + (lineIdx + 1) * lineHeight - 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', lineIdx === 0 && titleText ? '600' : 'normal')
          .attr('fill', '#333')
          .text(line);
      });

      // Lock indicator: small padlock in the bottom-right of the callout
      // when the annotation has been saved (lockedAt set). Communicates
      // that the comment is audit-stamped without crowding the title.
      if (d.comment?.lockedAt) {
        annotationsLayer
          .append('text')
          .attr('x', boxX + boxW - 4)
          .attr('y', boxY + boxH - 3)
          .attr('text-anchor', 'end')
          .attr('font-size', '9px')
          .attr('fill', '#9ca3af')
          .text('🔒');
      }

      // Native hover tooltip with the untruncated title + content,
      // plus the lock timestamp where present.
      const stamp = d.comment?.lockedAt
        ? ` (saved ${new Date(d.comment.lockedAt).toLocaleString()})`
        : '';
      annotationsLayer.append('title').text(
        (titleText && content ? `${titleText} — ${content}` : titleText || content) + stamp,
      );
    });

    // Logo (top-right). Cap at ~40% of the top margin so we don't crowd
    // the title text. The image is rendered as an SVG <image> so it
    // export to PNG without a network round-trip.
    if (logoDataUrl) {
      const logoH = Math.max(24, Math.min(marginTop - 8, 56));
      const logoW = logoH * 2.4; // crude aspect ceiling — the SVG
      // preserveAspectRatio attribute below keeps the image proportional
      // and fitted within the box.
      svg.append('image')
        .attr('href', logoDataUrl)
        .attr('xlink:href', logoDataUrl) // legacy attribute for older browsers
        .attr('x', width - marginRight - logoW)
        .attr('y', 4)
        .attr('width', logoW)
        .attr('height', logoH)
        .attr('preserveAspectRatio', 'xMaxYMin meet');
    }

    if (title) {
      svg.append('text')
        .attr('class', 'title')
        .attr('x', width / 2)
        .attr('y', marginTop / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${titleSize}px`)
        .text(title);
    }

    if (description) {
      svg.append('text')
        .attr('class', 'description')
        .attr('x', width / 2)
        .attr('y', marginTop / 2 + (titleSize ?? 18) * 0.9)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${Math.max(11, (titleSize ?? 18) * 0.65)}px`)
        .attr('fill', '#4b5563')
        .text(description);
    }

    // Variation + assurance badges. Drawn in SVG so they're carried into
    // the PNG export. Position: a row at the very top of the plot area
    // (just inside marginTop, left-aligned to the chart's plot edge).
    if (analysis.icons && (analysis.kind === 'XmR' || analysis.kind === 'RunChart' || analysis.kind === 'P' || analysis.kind === 'C' || analysis.kind === 'U')) {
      const variationStyles = {
        improvement: { fill: '#dbeafe', text: '#1e40af', symbol: '↑', label: 'Improvement', desc: 'Special-cause variation in the desired direction' },
        concerning:  { fill: '#ffedd5', text: '#9a3412', symbol: '!', label: 'Concerning',  desc: 'Special-cause variation needing investigation' },
        'common-cause': { fill: '#f3f4f6', text: '#374151', symbol: '~', label: 'Common cause', desc: 'No special-cause variation — natural process noise' },
      };
      const assuranceStyles = {
        pass:       { fill: '#dbeafe', text: '#1e40af', symbol: '✓', label: 'Consistently meeting', desc: 'Target sits beyond the limits in the favourable direction' },
        fail:       { fill: '#ffedd5', text: '#9a3412', symbol: '✗', label: 'Consistently missing', desc: 'Target sits beyond the limits in the unfavourable direction' },
        'hit-miss': { fill: '#f3f4f6', text: '#374151', symbol: '?', label: 'Hit-or-miss',          desc: 'Target is inside the limits — random chance will pass or fail it' },
      };
      const v = variationStyles[analysis.icons.variation];
      const a = analysis.icons.assurance ? assuranceStyles[analysis.icons.assurance] : null;

      const badgeY = Math.max(2, marginTop - 22);
      const padX = 10;
      const padRight = 12;
      const valueFont = 11;
      const symW = 14;
      // Conservative monospace estimate at 11px bold — bumped from 5.6
      // because text was being underestimated and the description
      // bleed into the label. We no longer render the description on
      // the badge itself — it lives in the SVG <title> hover tooltip
      // — so the badge only needs to fit the symbol circle + label.
      const charW = 6.4;
      const measureBadge = (style, prefix) => {
        const valueText = `${prefix}: ${style.label}`;
        const w = symW + padX + valueText.length * charW + padRight;
        return Math.max(140, w);
      };

      const variationW = measureBadge(v, 'Variation');
      const assuranceW = a ? measureBadge(a, 'Assurance') : 0;

      const drawBadge = (x0, w, style, prefix) => {
        const g = svg.append('g');
        g.append('rect')
          .attr('x', x0)
          .attr('y', badgeY)
          .attr('width', w)
          .attr('height', 18)
          .attr('rx', 9)
          .attr('fill', style.fill)
          .attr('stroke', style.text)
          .attr('stroke-opacity', 0.25);
        g.append('circle')
          .attr('cx', x0 + 9)
          .attr('cy', badgeY + 9)
          .attr('r', 7)
          .attr('fill', 'white')
          .attr('stroke', style.text)
          .attr('stroke-width', 0.75);
        g.append('text')
          .attr('x', x0 + 9)
          .attr('y', badgeY + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', `${valueFont}px`)
          .attr('font-weight', 700)
          .attr('fill', style.text)
          .text(style.symbol);
        g.append('text')
          .attr('x', x0 + symW + padX)
          .attr('y', badgeY + 12)
          .attr('font-size', `${valueFont}px`)
          .attr('font-weight', 600)
          .attr('fill', style.text)
          .text(`${prefix}: ${style.label}`);
        // Native tooltip carries the description so the on-chart text
        // stays uncluttered.
        g.append('title').text(`${prefix}: ${style.label} — ${style.desc}`);
      };

      let x0 = marginLeft;
      drawBadge(x0, variationW, v, 'Variation');
      x0 += variationW + 12;
      if (a) drawBadge(x0, assuranceW, a, 'Assurance');
    }

    if (xAxisLabel) {
      svg.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height * 0.98)
        .attr('font-size', `${axisLabelSize}px`)
        .text(xAxisLabel);
    }

    if (yAxisLabel) {
      svg.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'middle')
        .attr('y', 10)
        .attr('x', -height / 2)
        .attr('dy', '.75em')
        .attr('font-size', `${axisLabelSize}px`)
        .attr('transform', 'rotate(-90)')
        .text(yAxisLabel);
    }

  }, [
    analysis, width, height, marginTop, marginRight, marginBottom, marginLeft,
    title, titleSize, description, xAxisLabel, yAxisLabel, axisLabelSize, aim, outlierStatus, target,
    lineColor, lineWidth, medianColor, medianWidth, confColor, confWidth,
    defaultPointColor, successColor, outlierColor, yStart, events, pdsaBands,
    showMean, showLimits, showTarget, centreLineKind, logoDataUrl,
    backgroundColor, showForecast, forecastPeriods, increment,
  ]);

  const exportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    // Clone with explicit width/height so canvas drawImage gets a 1:1
    // raster regardless of how the live SVG is scaled in the DOM.
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    const xml = new XMLSerializer().serializeToString(clone);
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
        const safeTitle = (title || 'chart').replace(/[^a-z0-9\-_]+/gi, '_');
        a.href = URL.createObjectURL(blob);
        a.download = `${safeTitle}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  };

  const closeEditor = () => setEditing(null);
  const saveEditor = (next) => {
    if (!editing || !canEditAnnotations) return;
    // Three field calls — operations.ts updateRowField only handles one
    // field at a time. They go through parent setProject sequentially,
    // and React batches them into one paint.
    onUpdateRowField(editing.rowIndex, 'commentTitle', next.title);
    onUpdateRowField(editing.rowIndex, 'commentText', next.text);
    // lockedAt: keep the existing timestamp if already locked (audit
    // history preserved); stamp a fresh one on first save of a non-empty
    // annotation.
    const nowISO = new Date().toISOString();
    const nextLockedAt =
      next.title.trim() === '' && next.text.trim() === ''
        ? '' // empty annotation → unlocked + cleared
        : (editing.lockedAt || nowISO);
    onUpdateRowField(editing.rowIndex, 'commentLockedAt', nextLockedAt);
    setEditing(null);
  };
  const clearEditor = () => {
    if (!editing || !canEditAnnotations) return;
    onUpdateRowField(editing.rowIndex, 'commentTitle', '');
    onUpdateRowField(editing.rowIndex, 'commentText', '');
    onUpdateRowField(editing.rowIndex, 'commentLockedAt', '');
    setEditing(null);
  };
  const unlockEditor = () => {
    if (!editing) return;
    setEditing({ ...editing, lockedAt: null });
  };

  return (
    <div className="relative w-full max-w-full chart-fade-in">
      <svg ref={svgRef} className="block w-full h-auto" />
      {editing && canEditAnnotations && (
        <AnnotationPopover
          x={editing.cx}
          y={editing.cy}
          initialTitle={editing.title}
          initialText={editing.text}
          initialLockedAt={editing.lockedAt}
          containerWidth={width}
          onSave={saveEditor}
          onClear={clearEditor}
          onUnlock={unlockEditor}
          onCancel={closeEditor}
        />
      )}
      <div className="flex justify-end mt-2 gap-2">
        {typeof onExportCsv === 'function' && (
          <button
            type="button"
            onClick={onExportCsv}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            title="Download the measure data plus computed mean / limits / rule hits"
          >
            Export CSV
          </button>
        )}
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

function AnnotationPopover({
  x,
  y,
  initialTitle,
  initialText,
  initialLockedAt,
  containerWidth,
  onSave,
  onClear,
  onUnlock,
  onCancel,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const popW = 280;
  const left = Math.max(8, Math.min(containerWidth - popW - 8, x - popW / 2));
  const top = Math.max(8, y + 14);
  const titleEmpty = title.trim() === '' && initialTitle.trim() === '';
  const locked = Boolean(initialLockedAt);
  const lockedDate = initialLockedAt
    ? new Date(initialLockedAt).toLocaleString()
    : '';

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (!locked && e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'INPUT') {
      e.preventDefault();
      onSave({ title, text });
    }
  };

  return (
    <div
      className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3"
      style={{ left, top, width: popW }}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    >
      {locked && (
        <div className="mb-2 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <span aria-hidden>🔒</span>
          <span className="flex-1">
            Locked — first saved {lockedDate}.
          </span>
          <button
            type="button"
            onClick={onUnlock}
            className="text-amber-700 underline hover:text-amber-900"
          >
            Unlock to edit
          </button>
        </div>
      )}
      <input
        autoFocus={!locked}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Annotation title"
        readOnly={locked}
        className={`w-full text-sm border rounded px-2 py-1 mb-2 ${
          locked
            ? 'border-gray-200 bg-gray-50 text-gray-700'
            : 'border-gray-300'
        }`}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        readOnly={locked}
        className={`w-full text-sm border rounded px-2 py-1 mb-2 resize-none ${
          locked
            ? 'border-gray-200 bg-gray-50 text-gray-700'
            : 'border-gray-300'
        }`}
      />
      <div className="flex items-center justify-between gap-2">
        {!titleEmpty ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-600 hover:underline"
            title="Remove this annotation"
          >
            Remove
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900"
          >
            {locked ? 'Close' : 'Cancel'}
          </button>
          {!locked && (
            <button
              type="button"
              onClick={() => onSave({ title, text })}
              className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LineChart;
