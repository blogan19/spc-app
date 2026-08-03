import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint') ?? '';
  const fingertipsParams = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'endpoint') fingertipsParams.set(k, v); });
  const qs = fingertipsParams.size ? '?' + fingertipsParams.toString() : '';
  const url = `https://fingertips.phe.org.uk/api/${endpoint}${qs}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return Response.json({ error: `Fingertips API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
