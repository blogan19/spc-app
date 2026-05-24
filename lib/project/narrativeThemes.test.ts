import { describe, expect, it } from 'vitest';
import { clusterIncidentNarratives, tokenize } from './narrativeThemes';
import type { Incident } from './types';

let counter = 0;
const inc = (description: string): Incident => ({
  id: `i-${++counter}`,
  datetime: '2024-09-01',
  type: 'T',
  location: 'L',
  severity: 'low',
  description,
});

describe('tokenize', () => {
  it('lowercases, strips punctuation, drops short tokens and stopwords', () => {
    expect(tokenize('The Patient fell at three in the corridor!')).toEqual([
      'patient',
      'fell',
      'three',
      'corridor',
    ]);
  });

  it('keeps tokens of exactly 3 characters that are not stopwords', () => {
    expect(tokenize('pen pad bed')).toEqual(['pen', 'pad', 'bed']);
  });

  it('returns empty for empty/whitespace input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('drops fully-stopword input', () => {
    expect(tokenize('the it is and')).toEqual([]);
  });
});

describe('clusterIncidentNarratives', () => {
  it('clusters near-identical narratives together', () => {
    const incidents = [
      inc('Patient fell during transfer from wheelchair to bed'),
      inc('Patient fell while being transferred from bed to chair'),
      inc('Wrong medication dispensed to patient on Ward A'),
      inc('Patient given wrong medication by Ward A pharmacy'),
      inc('Fell during transfer wheelchair to bed early morning'),
      inc('Wrong dose of warfarin dispensed by Ward A pharmacy'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 2 });
    expect(result.effectiveK).toBe(2);
    expect(result.contributingCount).toBe(6);
    expect(result.clusters).toHaveLength(2);

    // The two clusters' top terms should reflect the two themes.
    const allTopTerms = result.clusters.flatMap((c) =>
      c.topTerms.map((t) => t.term),
    );
    expect(allTopTerms).toEqual(
      expect.arrayContaining(['fell', 'medication']),
    );
  });

  it('skips incidents with empty or all-stopword descriptions', () => {
    const incidents = [
      inc('Patient fell during transfer'),
      inc(''),
      inc('   '),
      inc('the and is it'),
      inc('Wrong medication dispensed'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 2 });
    // 2 had real content, 1 had only stopwords (counted as skipped).
    // The fully empty / whitespace-only ones never reach the analysis.
    expect(result.contributingCount).toBe(2);
    expect(result.skippedCount).toBe(1);
  });

  it('caps k at floor(n/2) so each cluster typically has at least 2 docs', () => {
    const incidents = [
      inc('one'),
      inc('two distinct sentence'),
      inc('three different unrelated content'),
      inc('four utterly unique words'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 8 });
    expect(result.effectiveK).toBe(2); // floor(4/2) = 2
  });

  it('returns an empty analysis when there are no narratives', () => {
    const result = clusterIncidentNarratives([], { k: 4 });
    expect(result.contributingCount).toBe(0);
    expect(result.clusters).toEqual([]);
  });

  it('handles k=1 by returning a single cluster of everyone', () => {
    const incidents = [
      inc('Patient fell during transfer'),
      inc('Wrong medication on Ward A'),
      inc('Pressure ulcer on Ward B'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 1 });
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].size).toBe(3);
  });

  it('orders clusters by size, largest first', () => {
    const incidents = [
      // 4 falls-themed
      inc('Patient fell from bed'),
      inc('Patient fell during transfer'),
      inc('Patient fell on way to bathroom'),
      inc('Patient fell while reaching for call bell'),
      // 2 medication-themed
      inc('Wrong dose of insulin given'),
      inc('Insulin dose missed at handover'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 2 });
    expect(result.clusters[0].size).toBeGreaterThanOrEqual(result.clusters[1].size);
    expect(result.clusters[0].id).toBe(0);
    expect(result.clusters[1].id).toBe(1);
  });

  it('picks representatives that are highly similar to the cluster centroid', () => {
    // Need ≥4 docs so k=2 is permitted by the floor(n/2) cap.
    const incidents = [
      inc('Patient fell during transfer to wheelchair'),
      inc('Patient fell during transfer to chair early morning'),
      inc('Patient fell while reaching for call bell at night'),
      inc('Coffee machine on Ward A is leaking water onto floor'),
      inc('Coffee machine spilling water on Ward A corridor'),
      inc('Coffee dispenser leaking near Ward A entrance'),
    ];
    const result = clusterIncidentNarratives(incidents, { k: 2 });
    expect(result.effectiveK).toBe(2);
    const fallsCluster = result.clusters.find((c) =>
      c.topTerms.some((t) => t.term === 'fell'),
    );
    expect(fallsCluster).toBeDefined();
    expect(fallsCluster!.representatives.length).toBeGreaterThan(0);
    for (const r of fallsCluster!.representatives) {
      expect(r.similarity).toBeGreaterThan(0);
    }
  });
});
