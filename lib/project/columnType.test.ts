import { describe, expect, it } from 'vitest';
import {
  classifyColumn,
  findCellIssues,
  looksLikeDate,
  looksLikeNumber,
} from './columnType';

describe('looksLikeDate', () => {
  it('accepts ISO dates', () => {
    expect(looksLikeDate('2024-05-12')).toBe(true);
  });

  it('accepts UK dates with slashes / dashes', () => {
    expect(looksLikeDate('12/05/2024')).toBe(true);
    expect(looksLikeDate('12-05-2024')).toBe(true);
  });

  it('accepts a plausible 4-digit year', () => {
    expect(looksLikeDate('2024')).toBe(true);
    expect(looksLikeDate('1900')).toBe(true);
    expect(looksLikeDate('2100')).toBe(true);
  });

  it('rejects 4-digit numbers outside the year range', () => {
    expect(looksLikeDate('1234')).toBe(false);
    expect(looksLikeDate('9999')).toBe(false);
  });

  it('rejects single- and two-digit integers (regression: Chrome legacy two-digit-year parsing)', () => {
    expect(looksLikeDate('1')).toBe(false);
    expect(looksLikeDate('2')).toBe(false);
    expect(looksLikeDate('12')).toBe(false);
    expect(looksLikeDate('99')).toBe(false);
  });

  it('rejects decimals', () => {
    expect(looksLikeDate('1.5')).toBe(false);
    expect(looksLikeDate('2024.5')).toBe(false);
  });

  it('rejects empty / non-date strings', () => {
    expect(looksLikeDate('')).toBe(false);
    expect(looksLikeDate('not-a-date')).toBe(false);
    expect(looksLikeDate('N/A')).toBe(false);
  });
});

describe('looksLikeNumber', () => {
  it('accepts integers and decimals', () => {
    expect(looksLikeNumber('5')).toBe(true);
    expect(looksLikeNumber('5.2')).toBe(true);
    expect(looksLikeNumber('-1')).toBe(true);
    expect(looksLikeNumber('0')).toBe(true);
  });

  it('rejects empty / non-numeric', () => {
    expect(looksLikeNumber('')).toBe(false);
    expect(looksLikeNumber('thirty-five')).toBe(false);
    expect(looksLikeNumber('N/A')).toBe(false);
  });
});

describe('classifyColumn', () => {
  it('classifies a column of counts as numeric, not date (regression)', () => {
    expect(classifyColumn(['2', '1', '3', '2', '1'])).toBe('numeric');
  });

  it('classifies a column of ISO dates as date', () => {
    expect(
      classifyColumn(['2024-01-01', '2024-02-01', '2024-03-01']),
    ).toBe('date');
  });

  it('classifies a column of plausible years as date', () => {
    expect(classifyColumn(['2020', '2021', '2022', '2023'])).toBe('date');
  });

  it('treats a column with mixed shape as mixed', () => {
    expect(classifyColumn(['2024-01-01', '42', 'banana', '2024-02-01'])).toBe(
      'mixed',
    );
  });

  it('classifies a wholly textual column as text (regression)', () => {
    expect(
      classifyColumn(['Ward A', 'Ward B', 'Ward C', 'Ward D']),
    ).toBe('text');
  });

  it('classifies a column with too few salvageable values as text', () => {
    // Only 1 of 5 looks numeric — well below the salvageable threshold.
    expect(
      classifyColumn(['banana', 'apple', 'pear', '5', 'orange']),
    ).toBe('text');
  });

  it('returns empty when there are no values', () => {
    expect(classifyColumn([])).toBe('empty');
    expect(classifyColumn(['', '   ', ''])).toBe('empty');
  });

  it('tolerates a handful of bad cells if the rest conform', () => {
    // 9 of 10 are numeric → numeric.
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bad'];
    expect(classifyColumn(values)).toBe('numeric');
  });
});

describe('findCellIssues', () => {
  const rows = [
    { date: '2024-01-01', value: '5' },
    { date: '2024-01-02', value: 'thirty' },
    { date: 'oops', value: '6' },
    { date: '2024-01-04', value: '' }, // empty value isn't an issue
    { date: '', value: '7' }, // empty date isn't an issue
  ];

  it('flags non-date date cells and non-numeric value cells', () => {
    const issues = findCellIssues(rows, 'date', 'value');
    expect(issues).toEqual([
      { rowIndex: 1, header: 'value', rawValue: 'thirty', reason: 'invalid_number' },
      { rowIndex: 2, header: 'date', rawValue: 'oops', reason: 'invalid_date' },
    ]);
  });

  it('returns nothing when the columns aren\'t supplied', () => {
    expect(findCellIssues(rows, undefined, undefined)).toEqual([]);
  });
});
