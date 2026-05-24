import { describe, expect, it } from 'vitest';
import { analyseSpc } from './index';
import { deriveIcons } from './icons';
import type { SpcRow } from './types';

const series = (values: number[]): SpcRow[] =>
  values.map((value, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value,
  }));

describe('variation icon', () => {
  it('returns common-cause when no rule fires', () => {
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 11]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase').variation).toBe('common-cause');
  });

  it('flags 6+ increasing as improvement when aim is increase', () => {
    const rows = series([1, 2, 3, 4, 5, 6, 7]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase').variation).toBe('improvement');
  });

  it('flags 6+ increasing as concerning when aim is decrease', () => {
    const rows = series([1, 2, 3, 4, 5, 6, 7]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'decrease').variation).toBe('concerning');
  });

  it('flags 6+ decreasing as improvement when aim is decrease', () => {
    const rows = series([100, 90, 80, 70, 60, 50]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'decrease').variation).toBe('improvement');
  });

  it('flags an upside spike as improvement when aim is increase', () => {
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 50]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase').variation).toBe('improvement');
  });

  it('flags an upside spike as concerning when aim is decrease', () => {
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 50]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'decrease').variation).toBe('concerning');
  });

  it('lets the most recent signal win when multiple rules fire', () => {
    // Early upward trend (improvement when aim=increase) followed by a
    // long stretch below the mean. The board should be told "concerning"
    // because that's the signal that needs reacting to *now*.
    const rows = series([3, 4, 5, 6, 7, 8, 9, 4, 4, 4, 4, 4, 4, 4]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase').variation).toBe('concerning');
    // And the inverse: same data, aim=decrease — the late below-mean run
    // is now the *good* signal, so the icon flips.
    expect(deriveIcons(rows, analysis, 'decrease').variation).toBe('improvement');
  });
});

describe('assurance icon', () => {
  it('returns null when no target is set', () => {
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 11]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase').assurance).toBeNull();
  });

  it('returns pass when target sits below LCL and aim is increase', () => {
    // Stable around 100 — limits are tight. Target=50 is far below LCL.
    const rows = series([100, 101, 99, 100, 102, 99, 101, 100, 102, 99]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase', 50).assurance).toBe('pass');
  });

  it('returns fail when target sits above UCL and aim is increase', () => {
    const rows = series([100, 101, 99, 100, 102, 99, 101, 100, 102, 99]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase', 200).assurance).toBe('fail');
  });

  it('returns hit-miss when target sits inside the limits', () => {
    const rows = series([100, 101, 99, 100, 102, 99, 101, 100, 102, 99]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'increase', 100).assurance).toBe('hit-miss');
  });

  it('inverts the pass/fail bands when aim is decrease', () => {
    const rows = series([100, 101, 99, 100, 102, 99, 101, 100, 102, 99]);
    const { analysis } = analyseSpc(rows);
    expect(deriveIcons(rows, analysis, 'decrease', 200).assurance).toBe('pass');
    expect(deriveIcons(rows, analysis, 'decrease', 50).assurance).toBe('fail');
  });
});
