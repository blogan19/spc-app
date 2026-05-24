// Multi-page PDF "report" for a project. Lazy-imports jsPDF so the
// generator's ~250KB bundle stays out of the initial page load.
//
// Layout:
//   Page 1 — Cover: project name + composed aim sentence + generation date.
//   For each measure with data — heading + variation/assurance text +
//     stats table + chart image.
//   Tail page — PDSA log + driver-diagram text outline.

import { analyseSpc, deriveIcons, describePlottedRows } from '@/lib/spc';
import { composeAimSentence } from './operations';
import type { DriverNode, Project } from './types';

export interface SvgAccessor {
  // Given a measure id, return its live SVG element (rendered in a
  // hidden DOM node). The PDF generator uses this to convert each
  // chart to a PNG.
  (measureId: string): SVGElement | null;
}

const PAGE_W = 595.28; // A4 portrait widths in jsPDF units (pt)
const PAGE_H = 841.89;
const MARGIN = 40;

async function svgToDataUrl(svg: SVGElement, w: number, h: number): Promise<string | null> {
  // Clone so we can apply explicit width/height for the canvas raster
  // without disturbing the live chart on the page.
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function describeMeasureForPdf(measure: Project['measures'][number]) {
  const kind = (['RunChart', 'P', 'C', 'U'] as const).includes(
    measure.chartKind as 'RunChart' | 'P' | 'C' | 'U',
  )
    ? (measure.chartKind as 'RunChart' | 'P' | 'C' | 'U')
    : ('XmR' as const);
  const sourceRows = measure.data
    .filter((d) => d?.date && d?.value !== '' && d?.value != null)
    .map((d) => ({
      date: d.date,
      value: Number(d.value),
      denominator:
        d?.denominator !== undefined && d?.denominator !== ''
          ? Number(d.denominator)
          : undefined,
      recalculate: Boolean(d?.comment?.recalculate),
    }))
    .filter((r) => Number.isFinite(r.value));
  if (sourceRows.length === 0) return null;
  const { analysis, plottedRows } = analyseSpc(sourceRows, { kind });
  const icons = deriveIcons(plottedRows, analysis, measure.aim, measure.target);
  const stats = describePlottedRows(plottedRows, analysis);
  return { analysis, icons, stats };
}

function flattenDriverNodes(nodes: DriverNode[], depth = 0, out: Array<{ depth: number; label: string }> = []) {
  for (const n of nodes) {
    out.push({ depth, label: `${n.type === 'change-idea' ? '◇' : '•'} ${n.label}` });
    if (n.children?.length) flattenDriverNodes(n.children, depth + 1, out);
  }
  return out;
}

export async function generateProjectReport(
  project: Project,
  getSvg: SvgAccessor,
): Promise<void> {
  const { default: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });

  // --- Cover page ---------------------------------------------------------
  let y = MARGIN + 40;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(project.name || 'Untitled project', MARGIN, y);
  y += 30;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Report generated ${new Date().toLocaleString()}`, MARGIN, y);
  y += 24;

  const aim = composeAimSentence(project.aim);
  if (aim) {
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Aim', MARGIN, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(aim, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 14 + 10;
  }

  // Measures summary on cover
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Measures in this report', MARGIN, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const m of project.measures) {
    const line = `• ${m.name} (${m.chartKind}, ${m.data.length} rows)`;
    const ll = doc.splitTextToSize(line, PAGE_W - MARGIN * 2);
    if (y > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(ll, MARGIN, y);
    y += ll.length * 12;
  }

  // --- Per-measure pages --------------------------------------------------
  for (const measure of project.measures) {
    doc.addPage();
    y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(measure.name, MARGIN, y);
    y += 22;

    const detail = describeMeasureForPdf(measure);
    if (detail) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40);
      const summary = `${measure.chartKind} chart · aim: ${measure.aim}${measure.target !== undefined ? ` · target ${measure.target}` : ''}`;
      doc.text(summary, MARGIN, y);
      y += 14;
      doc.setTextColor(60);
      const v = detail.icons.variation;
      const a = detail.icons.assurance;
      doc.text(
        `Variation: ${v}${a ? `   ·   Assurance: ${a}` : ''}`,
        MARGIN,
        y,
      );
      y += 18;
      doc.setTextColor(20);
    }

    // Chart image. Skip silently if there's no SVG available — the
    // off-screen mount may not have had a chance to render yet.
    const svg = getSvg(measure.id);
    if (svg) {
      const w = measure.settings.width || 1000;
      const h = measure.settings.height || 600;
      const dataUrl = await svgToDataUrl(svg, w, h);
      if (dataUrl) {
        const pdfW = PAGE_W - MARGIN * 2;
        const pdfH = (pdfW * h) / w;
        const fitH = Math.min(pdfH, PAGE_H - y - MARGIN);
        const fitW = (fitH * w) / h;
        doc.addImage(dataUrl, 'PNG', MARGIN, y, fitW, fitH);
        y += fitH + 14;
      }
    }

    // Stats table — keep it compact, ~3 columns.
    if (detail && detail.stats.ok) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      if (y > PAGE_H - MARGIN - 40) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text('Descriptive statistics', MARGIN, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const colW = (PAGE_W - MARGIN * 2) / 3;
      let col = 0;
      let rowTop = y;
      const rowH = 26;
      for (const s of detail.stats.stats) {
        const x = MARGIN + col * colW;
        if (rowTop > PAGE_H - MARGIN - rowH) {
          doc.addPage();
          y = MARGIN;
          rowTop = y;
          col = 0;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`${s.label}: ${s.value}`, x, rowTop);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        const hint = doc.splitTextToSize(s.explanation, colW - 6);
        doc.text(hint, x, rowTop + 10);
        doc.setTextColor(20);
        col += 1;
        if (col === 3) {
          col = 0;
          rowTop += rowH;
        }
      }
      y = rowTop + (col === 0 ? 0 : rowH) + 8;
    }
  }

  // --- Driver diagram + PDSA --------------------------------------------
  if ((project.driverDiagram?.primaryDrivers?.length ?? 0) > 0) {
    doc.addPage();
    y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Driver diagram', MARGIN, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const flat = flattenDriverNodes(project.driverDiagram!.primaryDrivers);
    for (const node of flat) {
      if (y > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(' '.repeat(node.depth * 4) + node.label, MARGIN, y);
      y += 14;
    }
  }

  if (project.pdsaCycles.length > 0) {
    doc.addPage();
    y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PDSA cycles', MARGIN, y);
    y += 20;
    for (const cycle of project.pdsaCycles) {
      if (y > PAGE_H - MARGIN - 60) {
        doc.addPage();
        y = MARGIN;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${cycle.title} — ${cycle.status}`, MARGIN, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = [
        cycle.question ? `Question: ${cycle.question}` : '',
        cycle.prediction ? `Prediction: ${cycle.prediction}` : '',
        cycle.result ? `Result: ${cycle.result}` : '',
        cycle.decision ? `Decision: ${cycle.decision}` : '',
      ].filter(Boolean);
      for (const l of lines) {
        const ll = doc.splitTextToSize(l, PAGE_W - MARGIN * 2);
        if (y > PAGE_H - MARGIN) {
          doc.addPage();
          y = MARGIN;
        }
        doc.text(ll, MARGIN, y);
        y += ll.length * 12;
      }
      y += 8;
    }
  }

  const safeName = (project.name || 'project').replace(/[^a-z0-9\-_]+/gi, '_');
  doc.save(`${safeName}-report.pdf`);
}
