/**
 * Splav86 River Routing & Waterway Pathfinding Engine
 * 
 * - Multi-mirror OSM Overpass waterway graph routing
 * - Spatial node bridging (<100m) for continuous river connectivity
 * - Sub-segment extraction from registered high-res river polylines
 * - Geodesic river distance measurement & GPX 1.1 exporter
 */

import { RiverRoute } from '../types';
import { calculateRiverTrackDistanceKm } from './geoUtils';

/**
 * Calculates perpendicular distance from a point to a line segment
 */
function distToSegmentSquared(
  p: [number, number],
  v: [number, number],
  w: [number, number]
): number {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p[0] - (v[0] + t * (w[0] - v[0]))) ** 2 + (p[1] - (v[1] + t * (w[1] - v[1]))) ** 2;
}

/**
 * Finds the closest projected point on a polyline
 */
export function projectPointOntoPolyline(
  poly: [number, number][],
  pt: [number, number]
): { index: number; projected: [number, number]; distanceKm: number } {
  let minDistanceDeg2 = Infinity;
  let bestIdx = 0;
  let bestPt: [number, number] = poly[0];

  for (let i = 0; i < poly.length - 1; i++) {
    const v = poly[i];
    const w = poly[i + 1];
    const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
    let t = 0;
    if (l2 > 0) {
      t = ((pt[0] - v[0]) * (w[0] - v[0]) + (pt[1] - v[1]) * (w[1] - v[1])) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    const projLat = v[0] + t * (w[0] - v[0]);
    const projLng = v[1] + t * (w[1] - v[1]);
    const d2 = (pt[0] - projLat) ** 2 + (pt[1] - projLng) ** 2;

    if (d2 < minDistanceDeg2) {
      minDistanceDeg2 = d2;
      bestIdx = i;
      bestPt = [projLat, projLng];
    }
  }

  const distanceKm = calculateRiverTrackDistanceKm([pt, bestPt]);
  return { index: bestIdx, projected: bestPt, distanceKm };
}

/**
 * Snap two points onto known river routes in the app database
 */
export function snapToKnownRiverRoutes(
  p1: [number, number],
  p2: [number, number],
  routes: RiverRoute[],
  maxSnapDistKm: number = 12.0
): [number, number][] | null {
  if (!routes || routes.length === 0) return null;

  for (const route of routes) {
    if (!route.coordinates || route.coordinates.length < 3) continue;

    const proj1 = projectPointOntoPolyline(route.coordinates, p1);
    const proj2 = projectPointOntoPolyline(route.coordinates, p2);

    if (proj1.distanceKm <= maxSnapDistKm && proj2.distanceKm <= maxSnapDistKm) {
      const idx1 = proj1.index;
      const idx2 = proj2.index;

      if (idx1 === idx2) {
        return [p1, proj1.projected, proj2.projected, p2];
      }

      const from = Math.min(idx1, idx2);
      const to = Math.max(idx1, idx2);
      let sub = route.coordinates.slice(from + 1, to + 1);

      if (idx1 > idx2) {
        sub = [...sub].reverse();
        return [p1, proj1.projected, ...sub, proj2.projected, p2];
      } else {
        return [p1, proj1.projected, ...sub, proj2.projected, p2];
      }
    }
  }

  return null;
}

// In-memory cache for Overpass waterway segments
const overpassCache = new Map<string, [number, number][][]>();

/**
 * Queries OpenStreetMap Overpass API with multiple mirrors for waterway polylines
 */
async function fetchOverpassWaterways(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<[number, number][][]> {
  const cacheKey = `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;
  if (overpassCache.has(cacheKey)) {
    return overpassCache.get(cacheKey)!;
  }

  const query = `[out:json][timeout:12];(
    way["waterway"~"river|stream|canal|rapids|fairway|drain"](${south},${west},${north},${east});
    way["natural"="water"](${south},${west},${north},${east});
  );out geom;`;

  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.osm.ch/api/interpreter?data=${encodeURIComponent(query)}`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const segments: [number, number][][] = [];

        if (json.elements && Array.isArray(json.elements)) {
          for (const el of json.elements) {
            if (el.geometry && el.geometry.length >= 2) {
              const seg: [number, number][] = el.geometry.map((g: any) => [g.lat, g.lon]);
              segments.push(seg);
            }
          }
        }

        if (segments.length > 0) {
          overpassCache.set(cacheKey, segments);
          return segments;
        }
      }
    } catch (e) {
      // try next mirror
    }
  }

  return [];
}

/**
 * Graph-based pathfinding along OpenStreetMap river waterways
 * Builds an undirected spatial graph with tolerance bridging across adjacent segments.
 */
function findWaterwayPathDijkstra(
  segments: [number, number][][],
  start: [number, number],
  end: [number, number]
): [number, number][] | null {
  if (!segments || segments.length === 0) return null;

  type NodeKey = string;
  const coordMap = new Map<NodeKey, [number, number]>();
  const adj = new Map<NodeKey, { to: NodeKey; dist: number }[]>();

  const toKey = (c: [number, number]): NodeKey => `${c[0].toFixed(5)},${c[1].toFixed(5)}`;

  const addEdge = (p1: [number, number], p2: [number, number]) => {
    const k1 = toKey(p1);
    const k2 = toKey(p2);
    if (!coordMap.has(k1)) coordMap.set(k1, p1);
    if (!coordMap.has(k2)) coordMap.set(k2, p2);
    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);

    const d = calculateRiverTrackDistanceKm([p1, p2]);
    adj.get(k1)!.push({ to: k2, dist: d });
    adj.get(k2)!.push({ to: k1, dist: d });
  };

  // Add all internal edges of every segment
  for (const seg of segments) {
    for (let i = 0; i < seg.length - 1; i++) {
      addEdge(seg[i], seg[i + 1]);
    }
  }

  // Bridge endpoints of different segments if they are close (< 120m / 0.0012 deg)
  const endpoints: [number, number][] = [];
  for (const seg of segments) {
    endpoints.push(seg[0]);
    endpoints.push(seg[seg.length - 1]);
  }

  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      const e1 = endpoints[i];
      const e2 = endpoints[j];
      const distDeg = Math.hypot(e1[0] - e2[0], e1[1] - e2[1]);
      if (distDeg < 0.0015 && distDeg > 0.00001) {
        addEdge(e1, e2);
      }
    }
  }

  // Find closest graph node for start and end
  let startKey: NodeKey | null = null;
  let endKey: NodeKey | null = null;
  let minStartD = Infinity;
  let minEndD = Infinity;

  coordMap.forEach((coord, key) => {
    const ds = calculateRiverTrackDistanceKm([start, coord]);
    if (ds < minStartD) {
      minStartD = ds;
      startKey = key;
    }
    const de = calculateRiverTrackDistanceKm([end, coord]);
    if (de < minEndD) {
      minEndD = de;
      endKey = key;
    }
  });

  // If points are beyond 18km from any river node, no path
  if (!startKey || !endKey || minStartD > 18 || minEndD > 18) {
    return null;
  }

  if (startKey === endKey) {
    return [start, coordMap.get(startKey)!, end];
  }

  // Dijkstra Shortest Path Search
  const distances = new Map<NodeKey, number>();
  const previous = new Map<NodeKey, NodeKey | null>();
  const visited = new Set<NodeKey>();
  const queue: { key: NodeKey; dist: number }[] = [];

  distances.set(startKey, 0);
  queue.push({ key: startKey, dist: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const curr = queue.shift()!;

    if (curr.key === endKey) break; // Found target!
    if (visited.has(curr.key)) continue;
    visited.add(curr.key);

    const neighbors = adj.get(curr.key) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const newDist = curr.dist + edge.dist;
      const oldDist = distances.get(edge.to) ?? Infinity;

      if (newDist < oldDist) {
        distances.set(edge.to, newDist);
        previous.set(edge.to, curr.key);
        queue.push({ key: edge.to, dist: newDist });
      }
    }
  }

  if (!previous.has(endKey) && startKey !== endKey) {
    return null; // Disconnected graph
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let k: NodeKey | null = endKey;
  while (k) {
    const pt = coordMap.get(k);
    if (pt) path.unshift(pt);
    k = previous.get(k) || null;
  }

  if (path.length < 2) return null;

  return [start, ...path, end];
}

/**
 * Resolves accurate river track between clicked waypoints
 */
export async function calculateExactRiverRoute(
  points: [number, number][],
  knownRoutes: RiverRoute[] = []
): Promise<{ path: [number, number][]; isWaterwaySnapped: boolean }> {
  if (points.length < 2) {
    return { path: points, isWaterwaySnapped: true };
  }

  const completePath: [number, number][] = [];
  let anySnapped = false;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // 1. Check local river geometries (Fastest & 100% reliable for catalog rivers)
    const localMatched = snapToKnownRiverRoutes(p1, p2, knownRoutes);
    if (localMatched && localMatched.length >= 2) {
      if (completePath.length > 0) completePath.pop();
      completePath.push(...localMatched);
      anySnapped = true;
      continue;
    }

    // 2. Fetch OSM Overpass waterway graph
    const south = Math.min(p1[0], p2[0]) - 0.15;
    const north = Math.max(p1[0], p2[0]) + 0.15;
    const west = Math.min(p1[1], p2[1]) - 0.18;
    const east = Math.max(p1[1], p2[1]) + 0.18;

    try {
      const waterways = await fetchOverpassWaterways(south, west, north, east);
      const graphPath = findWaterwayPathDijkstra(waterways, p1, p2);

      if (graphPath && graphPath.length >= 2) {
        if (completePath.length > 0) completePath.pop();
        completePath.push(...graphPath);
        anySnapped = true;
        continue;
      }
    } catch (e) {
      // Overpass network error
    }

    // 3. Fallback: Straight segment between the two points
    if (completePath.length > 0) completePath.pop();
    completePath.push(p1, p2);
  }

  return {
    path: completePath.length > 0 ? completePath : points,
    isWaterwaySnapped: anySnapped
  };
}

/**
 * Exports track coordinates to a standard GPX 1.1 file
 */
export function downloadGpxTrack(
  coordinates: [number, number][],
  trackName: string = 'Водный_маршрут_по_руслу',
  stats?: { distanceKm?: number }
) {
  if (!coordinates || coordinates.length === 0) return;

  const totalKm = stats?.distanceKm || calculateRiverTrackDistanceKm(coordinates);
  const safeName = trackName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
  const now = new Date().toISOString();

  const startPt = coordinates[0];
  const endPt = coordinates[coordinates.length - 1];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Splav86.ru - Водный туризм ХМАО и ЯНАО"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(trackName)}</name>
    <desc>Водный трек по руслу реки (${totalKm} км). Сгенерировано на Splav86.ru</desc>
    <time>${now}</time>
  </metadata>
  <wpt lat="${startPt[0]}" lon="${startPt[1]}">
    <name>Старт замера</name>
    <sym>Flag, Green</sym>
  </wpt>
  <wpt lat="${endPt[0]}" lon="${endPt[1]}">
    <name>Финиш замера (${totalKm} км)</name>
    <sym>Flag, Red</sym>
  </wpt>
  <trk>
    <name>${escapeXml(trackName)}</name>
    <desc>Протяженность по руслу реки: ${totalKm} км</desc>
    <trkseg>`;

  for (const [lat, lng] of coordinates) {
    xml += `\n      <trkpt lat="${lat}" lon="${lng}"></trkpt>`;
  }

  xml += `\n    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([xml], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}_${totalKm}km.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
