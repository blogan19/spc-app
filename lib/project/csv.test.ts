import { describe, expect, it } from 'vitest';
import {
  applyMapping,
  cleanRows,
  guessMapping,
  normalizeDate,
  parseCsv,
  validateImport,
} from './csv';

describe('normalizeDate', () => {
  it('returns ISO dates unchanged', () => {
    expect(normalizeDate('2024-09-02')).toBe('2024-09-02');
  });

  it('converts ISO month YYYY-MM to first of month', () => {
    expect(normalizeDate('2024-09')).toBe('2024-09-01');
    expect(normalizeDate('2024-9')).toBe('2024-09-01');
  });

  it('converts UK DD/MM/YYYY to ISO', () => {
    expect(normalizeDate('02/09/2024')).toBe('2024-09-02');
    expect(normalizeDate('2/9/2024')).toBe('2024-09-02');
  });

  it('converts DD-MM-YYYY to ISO', () => {
    expect(normalizeDate('02-09-2024')).toBe('2024-09-02');
  });

  it('converts European DD.MM.YYYY to ISO', () => {
    expect(normalizeDate('02.09.2024')).toBe('2024-09-02');
    expect(normalizeDate('2.9.2024')).toBe('2024-09-02');
  });

  it('converts DD-MMM-YYYY (month-name DMY) to ISO', () => {
    expect(normalizeDate('12-May-2024')).toBe('2024-05-12');
    expect(normalizeDate('12 May 2024')).toBe('2024-05-12');
    expect(normalizeDate('12/May/2024')).toBe('2024-05-12');
    expect(normalizeDate('1 January 2024')).toBe('2024-01-01');
  });

  it('handles 2-digit years in month-name DMY (assumed 21st century)', () => {
    expect(normalizeDate('12-May-24')).toBe('2024-05-12');
  });

  it('converts MMM-YY / MMM-YYYY (month-year shorthand) to first of month', () => {
    expect(normalizeDate('May-24')).toBe('2024-05-01');
    expect(normalizeDate('May 2024')).toBe('2024-05-01');
    expect(normalizeDate('May/2024')).toBe('2024-05-01');
    expect(normalizeDate('Jan-24')).toBe('2024-01-01');
    expect(normalizeDate('Sep-24')).toBe('2024-09-01');
  });

  it('converts YYYY-Qn quarter notation to first day of the quarter', () => {
    expect(normalizeDate('2024-Q1')).toBe('2024-01-01');
    expect(normalizeDate('2024-Q2')).toBe('2024-04-01');
    expect(normalizeDate('2024-Q3')).toBe('2024-07-01');
    expect(normalizeDate('2024-Q4')).toBe('2024-10-01');
    expect(normalizeDate('2024 Q3')).toBe('2024-07-01');
    expect(normalizeDate('2024Q3')).toBe('2024-07-01');
  });

  it('converts Qn YYYY (reversed) quarter notation', () => {
    expect(normalizeDate('Q3 2024')).toBe('2024-07-01');
    expect(normalizeDate('Q3-2024')).toBe('2024-07-01');
  });

  it('handles human-readable dates via Date.parse fallback', () => {
    expect(normalizeDate('2024-09-02T00:00:00Z')).toBe('2024-09-02');
  });

  it('does not parse bare numeric strings as dates (regression)', () => {
    expect(normalizeDate('2')).toBe('2');
    expect(normalizeDate('12')).toBe('12');
    expect(normalizeDate('1.5')).toBe('1.5');
  });

  it('passes through anything it does not recognise', () => {
    expect(normalizeDate('not a date')).toBe('not a date');
  });

  it('returns empty for empty input', () => {
    expect(normalizeDate('   ')).toBe('');
  });
});

describe('parseCsv', () => {
  it('parses a header row and produces records keyed by column', () => {
    const csv = 'date,value\n2024-09-02,82\n2024-09-03,81\n';
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['date', 'value']);
    expect(parsed.rows).toEqual([
      { date: '2024-09-02', value: '82' },
      { date: '2024-09-03', value: '81' },
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = 'date,value,note\n2024-09-02,82,"new pathway, started Monday"\n';
    const parsed = parseCsv(csv);
    expect(parsed.rows[0].note).toBe('new pathway, started Monday');
  });

  it('trims surrounding whitespace from headers', () => {
    const csv = ' date ,  value \n2024-09-02,82\n';
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['date', 'value']);
  });

  it('skips empty lines', () => {
    const csv = 'date,value\n2024-09-02,82\n\n2024-09-03,81\n';
    const parsed = parseCsv(csv);
    expect(parsed.rows).toHaveLength(2);
  });
});

describe('guessMapping', () => {
  it('matches the obvious headers', () => {
    const m = guessMapping(['date', 'value', 'title', 'note']);
    expect(m.date).toBe('date');
    expect(m.value).toBe('value');
    expect(m.commentTitle).toBe('title');
    expect(m.commentContent).toBe('note');
  });

  it('is case-insensitive', () => {
    const m = guessMapping(['Period', 'Rate per 1000']);
    expect(m.date).toBe('Period');
    expect(m.value).toBe('Rate per 1000');
  });

  it('returns undefined for missing roles', () => {
    const m = guessMapping(['x', 'y']);
    expect(m.value).toBe('y');
    expect(m.date).toBeUndefined();
  });
});

describe('applyMapping', () => {
  it('produces MeasureRow[] with normalised dates', () => {
    const csv = 'date,value,title,note\n02/09/2024,82,change,new pathway\n';
    const parsed = parseCsv(csv);
    const rows = applyMapping(parsed, {
      date: 'date',
      value: 'value',
      commentTitle: 'title',
      commentContent: 'note',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      date: '2024-09-02',
      value: '82',
      comment: { title: 'change', label: 'new pathway', recalculate: false },
    });
  });

  it('omits comment columns when not mapped', () => {
    const csv = 'date,value,extra\n2024-09-02,82,ignored\n';
    const parsed = parseCsv(csv);
    const rows = applyMapping(parsed, { date: 'date', value: 'value' });
    expect(rows[0].comment).toEqual({ title: '', label: '', recalculate: false });
  });

  it('tolerates missing cells (returns empty string)', () => {
    const csv = 'date,value\n2024-09-02,\n';
    const parsed = parseCsv(csv);
    const rows = applyMapping(parsed, { date: 'date', value: 'value' });
    expect(rows[0].value).toBe('');
  });
});

const buildCsv = (lines: string[]) => lines.join('\n') + '\n';

describe('validateImport', () => {
  it('flags empty dates and values as errors', () => {
    const csv = buildCsv([
      'date,value',
      '2024-09-02,82',
      ',83',
      '2024-09-04,',
    ]);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.errorCount).toBe(2);
    expect(v.errorRowIndices).toEqual([1, 2]);
    expect(v.rowLevel[1]).toBe('error');
    expect(v.rowLevel[2]).toBe('error');
  });

  it('flags unparseable dates as errors', () => {
    const csv = buildCsv(['date,value', 'banana-cake,82', '2024-09-03,83']);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.errorRowIndices).toEqual([0]);
    expect(v.issues.find((i) => i.rowIndex === 0)?.message).toMatch(/banana-cake/);
  });

  it('flags non-numeric values as errors', () => {
    const csv = buildCsv(['date,value', '2024-09-02,n/a', '2024-09-03,83']);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.errorRowIndices).toEqual([0]);
    expect(v.issues.find((i) => i.field === 'value')?.message).toMatch(/n\/a/);
  });

  it('warns about duplicate dates without blocking import', () => {
    const csv = buildCsv([
      'date,value',
      '2024-09-02,82',
      '2024-09-02,83',
    ]);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.errorCount).toBe(0);
    expect(v.warningCount).toBeGreaterThan(0);
    expect(v.rowLevel[1]).toBe('warning');
  });

  it('warns about out-of-order dates at dataset level', () => {
    const csv = buildCsv([
      'date,value',
      '2024-09-03,82',
      '2024-09-02,83',
      '2024-09-04,84',
    ]);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.issues.some((i) => i.message.includes('not in chronological order'))).toBe(true);
  });

  it('warns when fewer than 12 valid rows', () => {
    const lines = ['date,value'];
    for (let i = 1; i <= 5; i++) lines.push(`2024-09-0${i},${80 + i}`);
    const parsed = parseCsv(buildCsv(lines));
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    expect(v.issues.some((i) => i.message.includes('XmR limits are less reliable'))).toBe(true);
  });

  it('returns nothing flagged when no mapping yet', () => {
    const csv = buildCsv(['date,value', '2024-09-02,82']);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: '', value: '' });
    expect(v.errorCount).toBe(0);
    expect(v.warningCount).toBe(0);
  });
});

describe('cleanRows', () => {
  it('drops error rows and sorts by date by default', () => {
    const csv = buildCsv([
      'date,value',
      '2024-09-04,84',
      '2024-09-02,n/a', // value error
      '2024-09-03,83',
      ',81', // date error
    ]);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    const rows = cleanRows(parsed, { date: 'date', value: 'value' }, v);
    expect(rows.map((r) => r.date)).toEqual(['2024-09-03', '2024-09-04']);
  });

  it('preserves order when sortByDate is off', () => {
    const csv = buildCsv([
      'date,value',
      '2024-09-04,84',
      '2024-09-02,82',
    ]);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    const rows = cleanRows(parsed, { date: 'date', value: 'value' }, v, { sortByDate: false });
    expect(rows.map((r) => r.date)).toEqual(['2024-09-04', '2024-09-02']);
  });

  it('keeps invalid rows when dropInvalidRows is off', () => {
    const csv = buildCsv(['date,value', '2024-09-02,n/a', '2024-09-03,83']);
    const parsed = parseCsv(csv);
    const v = validateImport(parsed, { date: 'date', value: 'value' });
    const rows = cleanRows(parsed, { date: 'date', value: 'value' }, v, { dropInvalidRows: false });
    expect(rows).toHaveLength(2);
  });
});
