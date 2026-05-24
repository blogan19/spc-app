// Incident-narrative theme clustering. TF-IDF + cosine k-means in pure JS.
// Per plan §11, "Free-text clustering needs an embeddings provider;
// default to local… to keep narratives off third-party APIs." TF-IDF
// is coarser than transformer embeddings but is local, fast, and
// requires no model assets.

import type { Incident } from './types';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'can', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have',
  'he', 'her', 'his', 'i', 'if', 'in', 'is', 'it', 'its', 'me',
  'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out', 'over', 'she',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'too', 'up', 'us',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who',
  'will', 'with', 'would', 'you', 'your', 'about', 'after', 'all',
  'also', 'any', 'because', 'before', 'between', 'both', 'each',
  'how', 'into', 'just', 'more', 'most', 'other', 'only', 'should',
  'very', 'while', 'why',
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

interface Doc {
  id: string;
  text: string;
  tokens: string[];
  vector: Map<string, number>; // normalised TF-IDF, unit length
}

function buildDocs(incidents: readonly Incident[]): Doc[] {
  const raw = incidents
    .filter((i) => (i.description ?? '').trim().length > 0)
    .map((i) => ({
      id: i.id,
      text: (i.description ?? '').trim(),
      tokens: tokenize(i.description ?? ''),
    }))
    .filter((d) => d.tokens.length > 0);

  if (raw.length === 0) return [];

  // Document frequency
  const df = new Map<string, number>();
  for (const d of raw) {
    const seen = new Set<string>();
    for (const t of d.tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const N = raw.length;
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(N / n) + 1); // smoothed IDF

  return raw.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const len = d.tokens.length;
    const vec = new Map<string, number>();
    for (const [t, n] of tf) {
      const w = (n / len) * (idf.get(t) ?? 0);
      if (w > 0) vec.set(t, w);
    }
    // Normalise to unit length.
    let norm = 0;
    for (const w of vec.values()) norm += w * w;
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (const [k, v] of vec) vec.set(k, v / norm);
    }
    return { ...d, vector: vec };
  });
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  // Vectors are unit-length, so dot product = cosine similarity.
  let dot = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = smaller === a ? b : a;
  for (const [k, v] of smaller) {
    const w = larger.get(k);
    if (w !== undefined) dot += v * w;
  }
  return dot;
}

function meanVector(vectors: readonly Map<string, number>[]): Map<string, number> {
  const sum = new Map<string, number>();
  for (const v of vectors) {
    for (const [k, w] of v) sum.set(k, (sum.get(k) ?? 0) + w);
  }
  const n = vectors.length;
  if (n === 0) return sum;
  for (const [k, w] of sum) sum.set(k, w / n);
  // Re-normalise centroid for cosine comparisons.
  let norm = 0;
  for (const w of sum.values()) norm += w * w;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (const [k, v] of sum) sum.set(k, v / norm);
  }
  return sum;
}

interface KmeansResult {
  /** assignments[docIndex] = clusterIndex */
  assignments: number[];
  centroids: Map<string, number>[];
}

function kmeans(docs: Doc[], k: number, seed = 1, maxIter = 50): KmeansResult {
  if (docs.length === 0 || k <= 0) return { assignments: [], centroids: [] };
  const effectiveK = Math.min(k, docs.length);
  // Deterministic init: pick docs at evenly spaced indices to avoid the
  // worst random starts.
  const init: Map<string, number>[] = [];
  for (let i = 0; i < effectiveK; i++) {
    const idx = Math.floor((i * docs.length) / effectiveK);
    init.push(new Map(docs[idx].vector));
  }
  let centroids = init;
  const assignments = new Array<number>(docs.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < docs.length; i++) {
      let best = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const sim = cosine(docs[i].vector, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    if (!changed) break;

    const buckets: Doc[][] = Array.from({ length: effectiveK }, () => []);
    for (let i = 0; i < docs.length; i++) buckets[assignments[i]].push(docs[i]);

    centroids = buckets.map((bucket, c) => {
      if (bucket.length === 0) {
        // Empty cluster — re-seed from the document farthest from any
        // current centroid to spread the clusters out.
        let farthest = 0;
        let farthestScore = Infinity;
        for (let i = 0; i < docs.length; i++) {
          let best = -Infinity;
          for (const cen of centroids) {
            const sim = cosine(docs[i].vector, cen);
            if (sim > best) best = sim;
          }
          if (best < farthestScore) {
            farthestScore = best;
            farthest = i;
          }
        }
        return new Map(docs[farthest].vector);
      }
      return meanVector(bucket.map((d) => d.vector));
    });
  }

  return { assignments, centroids };
}

export interface ClusterTerm {
  term: string;
  weight: number;
}

export interface ClusterRepresentative {
  id: string;
  text: string;
  similarity: number;
}

export interface ThemeCluster {
  id: number;
  size: number;
  topTerms: ClusterTerm[];
  representatives: ClusterRepresentative[];
}

export interface NarrativeThemesOptions {
  /** Number of clusters requested. Capped at floor(N/2). Default 4. */
  k?: number;
  /** Max top terms shown per cluster. Default 6. */
  termsPerCluster?: number;
  /** Max representative narratives per cluster. Default 3. */
  representativesPerCluster?: number;
}

export interface ThemesAnalysis {
  /** Documents that contributed (had non-empty descriptions and at least one non-stopword token). */
  contributingCount: number;
  /** Documents that were skipped (empty description or all-stopword). */
  skippedCount: number;
  /** Effective k used (may be lower than requested when documents are scarce). */
  effectiveK: number;
  clusters: ThemeCluster[];
}

const DEFAULT_K = 4;

export function clusterIncidentNarratives(
  incidents: readonly Incident[],
  options: NarrativeThemesOptions = {},
): ThemesAnalysis {
  const requestedK = Math.max(1, options.k ?? DEFAULT_K);
  const termsPerCluster = options.termsPerCluster ?? 6;
  const repsPerCluster = options.representativesPerCluster ?? 3;

  const incidentsWithNarrative = incidents.filter(
    (i) => (i.description ?? '').trim().length > 0,
  );
  const docs = buildDocs(incidents);
  const skipped = incidentsWithNarrative.length - docs.length;

  if (docs.length === 0) {
    return {
      contributingCount: 0,
      skippedCount: incidentsWithNarrative.length,
      effectiveK: 0,
      clusters: [],
    };
  }

  // Cap k at floor(N/2) so each cluster has at least two docs on average
  // (clusters of one are usually accidents, not themes).
  const effectiveK = Math.max(1, Math.min(requestedK, Math.floor(docs.length / 2) || 1));

  const { assignments, centroids } = kmeans(docs, effectiveK);

  const clusters: ThemeCluster[] = [];
  for (let c = 0; c < effectiveK; c++) {
    const members = docs.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;

    // Top terms: largest weights in the centroid.
    const topTerms = Array.from(centroids[c])
      .sort((a, b) => b[1] - a[1])
      .slice(0, termsPerCluster)
      .map(([term, weight]) => ({ term, weight }));

    // Representatives: members closest to the centroid.
    const representatives = members
      .map((m) => ({
        id: m.id,
        text: m.text,
        similarity: cosine(m.vector, centroids[c]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, repsPerCluster);

    clusters.push({ id: c, size: members.length, topTerms, representatives });
  }

  // Order clusters by size (largest first) for the user's eye.
  clusters.sort((a, b) => b.size - a.size);
  clusters.forEach((cl, i) => {
    cl.id = i;
  });

  return {
    contributingCount: docs.length,
    skippedCount: skipped,
    effectiveK,
    clusters,
  };
}
