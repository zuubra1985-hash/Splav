/**
 * Wikipedia API integration utility for automatic river data extraction.
 * Uses local proxy /api/wikipedia/river with official Russian Wikipedia MediaWiki APIs fallback.
 */

export interface WikipediaRiverInfo {
  found: boolean;
  title: string;
  displayTitle: string;
  extract: string;
  description?: string;
  pageUrl: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  lengthKm?: number;
  riverBasin?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Clean river name from prefixes like "р.", "река", "сплав по", etc.
 */
export function cleanRiverName(input: string): string {
  if (!input) return '';
  return input
    .replace(/^р\.\s*/i, '')
    .replace(/^река\s+/i, '')
    .replace(/^сплав\s+по\s+(реке\s+)?/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/**
 * Search Wikipedia for river articles and return structured river information.
 */
export async function fetchWikipediaRiverData(rawRiverName: string): Promise<WikipediaRiverInfo | null> {
  const cleanName = cleanRiverName(rawRiverName);
  if (!cleanName || cleanName.length < 2) return null;

  // 1. Primary Strategy: Try our server-side Wikipedia proxy
  try {
    const serverRes = await fetch(`/api/wikipedia/river?query=${encodeURIComponent(cleanName)}`);
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && data.found && data.extract) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn('Server wikipedia proxy unreachable, falling back to direct MediaWiki API:', serverErr);
  }

  // 2. Client-side Fallback Strategy: Direct MediaWiki Action API with origin=* (No CORS preflight problems)
  const candidates = [
    `${cleanName} (река)`,
    `${cleanName} (приток Оби)`,
    `${cleanName} (приток Иртыша)`,
    `${cleanName} (приток Ваха)`,
    `${cleanName} (приток Таза)`,
    `${cleanName} (приток Пура)`,
    `${cleanName} (приток Казыма)`,
    `${cleanName} (приток Северной Сосьвы)`,
    cleanName,
    `Река ${cleanName}`
  ];

  for (const candidate of candidates) {
    try {
      const mwUrl = `https://ru.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(candidate)}&prop=extracts|pageimages|coordinates|info&inprop=url&explaintext=1&exintro=1&piprop=thumbnail|original&pithumbsize=800&format=json&origin=*`;
      const res = await fetch(mwUrl);
      if (res.ok) {
        const mwData = await res.json();
        const pages = mwData.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1') {
          const page = pages[pageId];
          if (page.extract && page.extract.length > 25 && !page.extract.includes('может означать:')) {
            return parseMediaWikiPage(page);
          }
        }
      }
    } catch {
      // Continue next candidate
    }
  }

  // 3. Fallback: Search Wikipedia API for closest hit
  try {
    const searchUrl = `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName + ' река')}&srlimit=4&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const hits = searchData.query?.search || [];
      for (const hit of hits) {
        const mwUrl = `https://ru.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(hit.title)}&prop=extracts|pageimages|coordinates|info&inprop=url&explaintext=1&exintro=1&piprop=thumbnail|original&pithumbsize=800&format=json&origin=*`;
        const res = await fetch(mwUrl);
        if (res.ok) {
          const mwData = await res.json();
          const pages = mwData.query?.pages || {};
          const pageId = Object.keys(pages)[0];
          if (pageId && pageId !== '-1') {
            const page = pages[pageId];
            if (page.extract && page.extract.length > 25 && !page.extract.includes('может означать:')) {
              return parseMediaWikiPage(page);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('MediaWiki search error:', err);
  }

  return null;
}

/**
 * Search suggestions list on Wikipedia
 */
export async function searchWikipediaSuggestions(query: string): Promise<Array<{ title: string; snippet: string }>> {
  const clean = cleanRiverName(query);
  if (!clean || clean.length < 2) return [];

  // Try server proxy first
  try {
    const res = await fetch(`/api/wikipedia/suggestions?query=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}

  // Direct MediaWiki fallback
  try {
    const searchUrl = `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean + ' река')}&srlimit=5&utf8=&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = await res.json();
      return (data.query?.search || []).map((item: any) => ({
        title: item.title,
        snippet: (item.snippet || '').replace(/<[^>]*>?/gm, '')
      }));
    }
  } catch (e) {
    console.warn('Direct Wikipedia suggestions error:', e);
  }
  return [];
}

function parseMediaWikiPage(page: any): WikipediaRiverInfo {
  const extract: string = page.extract || '';

  // Extract river length
  let lengthKm: number | undefined;
  const lengthMatch = extract.match(/(?:длина|длиной|протяжённость(?:ю)?)\s*(?:реки)?\s*(?:составляет)?\s*—?\s*(\d+[\d\s,.]*)\s*км/i);
  if (lengthMatch && lengthMatch[1]) {
    const parsed = parseFloat(lengthMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed > 3 && parsed < 6000) {
      lengthKm = Math.round(parsed);
    }
  }

  // Extract basin
  let riverBasin: string | undefined;
  if (/бассейн(?:а|е)?\s+(?:реки\s+)?Оби/i.test(extract)) {
    riverBasin = 'Бассейн реки Обь';
  } else if (/бассейн(?:а|е)?\s+(?:реки\s+)?Иртыш/i.test(extract)) {
    riverBasin = 'Бассейн реки Иртыш';
  } else if (/бассейн(?:а|е)?\s+(?:реки\s+)?Таз/i.test(extract)) {
    riverBasin = 'Бассейн реки Таз';
  } else if (/бассейн(?:а|е)?\s+(?:реки\s+)?Пур/i.test(extract)) {
    riverBasin = 'Бассейн реки Пур';
  } else if (/Карск(?:ое|ого)\s+мор/i.test(extract)) {
    riverBasin = 'Бассейн Карского моря';
  } else if (/бассейн(?:а|е)?\s+(?:реки\s+)?Енисе/i.test(extract)) {
    riverBasin = 'Бассейн реки Енисей';
  }

  let coordinates: { lat: number; lng: number } | undefined;
  if (page.coordinates && Array.isArray(page.coordinates) && page.coordinates[0]) {
    const c = page.coordinates[0];
    if (typeof c.lat === 'number' && typeof c.lon === 'number') {
      coordinates = {
        lat: Number(c.lat.toFixed(5)),
        lng: Number(c.lon.toFixed(5))
      };
    }
  }

  const title = page.title || '';
  const displayTitle = title.replace(/\s*\([^)]*\)/g, '');
  const pageUrl = page.fullurl || `https://ru.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const thumbnailUrl = page.thumbnail?.source;
  const originalImageUrl = page.original?.source || thumbnailUrl;

  return {
    found: true,
    title,
    displayTitle,
    extract,
    description: `Река в бассейне ${riverBasin || 'Западной Сибири'}`,
    pageUrl,
    thumbnailUrl,
    originalImageUrl,
    lengthKm,
    riverBasin,
    coordinates
  };
}

