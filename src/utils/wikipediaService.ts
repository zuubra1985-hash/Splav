/**
 * Wikipedia API integration utility for automatic river data extraction.
 * Uses official Russian Wikipedia REST & MediaWiki APIs with CORS support.
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
 * Search Wikipedia for river articles and return the most relevant one.
 */
export async function fetchWikipediaRiverData(rawRiverName: string): Promise<WikipediaRiverInfo | null> {
  const cleanName = cleanRiverName(rawRiverName);
  if (!cleanName || cleanName.length < 2) return null;

  // Candidates list in order of specificity
  const candidates = [
    `${cleanName} (река)`,
    `${cleanName} (приток Оби)`,
    `${cleanName} (приток Иртыша)`,
    `${cleanName} (приток Ваха)`,
    `${cleanName} (приток Таза)`,
    `${cleanName} (приток Пура)`,
    cleanName,
    `Река ${cleanName}`
  ];

  // 1. Try direct summary fetch for candidates
  for (const candidate of candidates) {
    try {
      const summaryUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`;
      const res = await fetch(summaryUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Ensure it's not a disambiguation page and has extract
        if (data.type === 'standard' && data.extract) {
          return parseWikipediaSummary(data);
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 2. Fallback: Search Wikipedia API with keywords
  try {
    const searchUrl = `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName + ' река')}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const firstHit = searchData.query?.search?.[0];
      if (firstHit && firstHit.title) {
        const summaryUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`;
        const res = await fetch(summaryUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.extract) {
            return parseWikipediaSummary(data);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Wikipedia search error:', err);
  }

  return null;
}

/**
 * Search suggestions list on Wikipedia
 */
export async function searchWikipediaSuggestions(query: string): Promise<Array<{ title: string; snippet: string }>> {
  const clean = cleanRiverName(query);
  if (!clean || clean.length < 2) return [];

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
    console.warn(e);
  }
  return [];
}

function parseWikipediaSummary(data: any): WikipediaRiverInfo {
  const extract: string = data.extract || '';
  
  // Try to parse length from text (e.g. "длина — 185 км", "длина реки — 340 км", "протяжённость 210 км")
  let lengthKm: number | undefined;
  const lengthMatch = extract.match(/(?:длина|длиной|протяжённость(?:ю)?)\s*(?:реки)?\s*(?:составляет)?\s*—?\s*(\d+[\d\s,.]*)\s*км/i);
  if (lengthMatch && lengthMatch[1]) {
    const parsed = parseFloat(lengthMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed > 5 && parsed < 6000) {
      lengthKm = Math.round(parsed);
    }
  }

  // Try to parse basin
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
  }

  let coordinates: { lat: number; lng: number } | undefined;
  if (data.coordinates && typeof data.coordinates.lat === 'number' && typeof data.coordinates.lon === 'number') {
    coordinates = {
      lat: Number(data.coordinates.lat.toFixed(5)),
      lng: Number(data.coordinates.lon.toFixed(5))
    };
  }

  return {
    found: true,
    title: data.title,
    displayTitle: data.displaytitle ? data.displaytitle.replace(/<[^>]*>?/gm, '') : data.title,
    extract: extract,
    description: data.description || '',
    pageUrl: data.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
    thumbnailUrl: data.thumbnail?.source,
    originalImageUrl: data.originalimage?.source,
    lengthKm,
    riverBasin,
    coordinates
  };
}
