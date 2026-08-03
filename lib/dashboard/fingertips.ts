export interface FingertipsIndicator {
  IndicatorId: number;
  IndicatorName: string;
  Descriptive?: { Name?: string; Definition?: string; DataSource?: string };
}

export interface FingertipsAreaType {
  Id: number;
  Name: string;
  Short: string;
}

export interface FingertipsDataPoint {
  AreaCode: string;
  AreaName: string;
  Period: string;
  Value: number | null;
  Count: number | null;
  Denominator: number | null;
}

export const AREA_TYPE_OPTIONS: FingertipsAreaType[] = [
  { Id: 102, Name: 'England', Short: 'England' },
  { Id: 6,   Name: 'NHS Region', Short: 'NHS Region' },
  { Id: 167, Name: 'Integrated Care Board', Short: 'ICB' },
  { Id: 101, Name: 'County & UA (pre-2019)', Short: 'County/UA' },
  { Id: 202, Name: 'District & UA', Short: 'District/UA' },
  { Id: 15,  Name: 'Local Authority', Short: 'LA' },
];

async function fingertipsFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams({ endpoint, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`/api/fingertips?${qs.toString()}`);
  if (!res.ok) throw new Error(`Fingertips error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchIndicators(query: string): Promise<FingertipsIndicator[]> {
  if (!query.trim()) return [];
  const data = await fingertipsFetch<{ Indicators?: FingertipsIndicator[] } | FingertipsIndicator[]>(
    'indicator_metadata/search',
    { search_text: query.trim() },
  );
  // API returns either an array or { Indicators: [...] }
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'Indicators' in data) return (data as { Indicators: FingertipsIndicator[] }).Indicators ?? [];
  return [];
}

export interface RawFingertipsPoint {
  AreaCode: string;
  AreaName?: string;
  Period: string;
  Value?: { Value: number | null; Count: number | null; Denominator: number | null };
}

export async function fetchIndicatorData(
  indicatorId: number,
  areaTypeId: number,
): Promise<FingertipsDataPoint[]> {
  // Try the grouped endpoint first; fall back to flat list
  let raw: RawFingertipsPoint[] = [];
  try {
    const resp = await fingertipsFetch<{ Data?: RawFingertipsPoint[] } | RawFingertipsPoint[]>(
      'all_data/by_indicator_id',
      { indicator_id: indicatorId, area_type_id: areaTypeId },
    );
    if (Array.isArray(resp)) raw = resp;
    else if (resp && 'Data' in resp) raw = (resp as { Data: RawFingertipsPoint[] }).Data ?? [];
  } catch {
    throw new Error('Failed to fetch indicator data from Fingertips.');
  }

  return raw.map((r) => ({
    AreaCode: r.AreaCode ?? '',
    AreaName: r.AreaName ?? r.AreaCode ?? '',
    Period: r.Period ?? '',
    Value: r.Value?.Value ?? null,
    Count: r.Value?.Count ?? null,
    Denominator: r.Value?.Denominator ?? null,
  }));
}
