export function makeFilename(chartName: string, dashboardTitle: string, ext: string): string {
  const date = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).replace(' ', ' ');
  const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '-').trim();
  return `${safe(chartName)} — ${safe(dashboardTitle || 'Dashboard')} — ${date}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSvg(svgEl: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svgEl);
  downloadBlob(new Blob([svgStr], { type: 'image/svg+xml' }), filename);
}

function svgToPngBlob(svgEl: SVGSVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const rect = svgEl.getBoundingClientRect();
    const w = rect.width || Number(svgEl.getAttribute('width')) || 600;
    const h = rect.height || Number(svgEl.getAttribute('height')) || 400;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('canvas.toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
    img.src = url;
  });
}

export async function exportPng(svgEl: SVGSVGElement, filename: string) {
  const blob = await svgToPngBlob(svgEl);
  downloadBlob(blob, filename);
}

export async function copyAsPng(svgEl: SVGSVGElement): Promise<void> {
  const blob = await svgToPngBlob(svgEl);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}

export function exportCsv(headers: string[], rows: (string | number | null)[][], filename: string) {
  const escape = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), filename);
}

export async function copyAsTable(headers: string[], rows: (string | number | null)[][]): Promise<void> {
  const tsv = [headers, ...rows].map((r) => r.map((v) => (v == null ? '' : String(v))).join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}
