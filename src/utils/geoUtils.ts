/**
 * Generates natural sinuous river meander points between key waypoints
 * to ensure tracks follow realistic waterbeds rather than straight lines.
 */
export function generateRiverMeanders(
  waypoints: [number, number][],
  segmentsPerLeg: number = 14,
  amplitudeDeg: number = 0.012
): [number, number][] {
  const result: [number, number][] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    const legLen = Math.sqrt(dLat * dLat + dLng * dLng);

    // Normal vector perpendicular to the segment
    const nLat = -dLng / (legLen || 1);
    const nLng = dLat / (legLen || 1);

    // Add alternating direction per leg for realistic S-curves
    const sign = i % 2 === 0 ? 1 : -1;

    for (let s = 0; s < segmentsPerLeg; s++) {
      const t = s / segmentsPerLeg;
      
      // Multi-harmonic natural river meandering formula
      const wave1 = Math.sin(t * Math.PI) * sign * amplitudeDeg;
      const wave2 = Math.sin(t * Math.PI * 3) * (amplitudeDeg * 0.35);
      const totalWave = wave1 + wave2;

      const subLat = p1[0] + dLat * t + nLat * totalWave;
      const subLng = p1[1] + dLng * t + nLng * totalWave;

      result.push([Math.round(subLat * 100000) / 100000, Math.round(subLng * 100000) / 100000]);
    }
  }

  // Push final point
  result.push(waypoints[waypoints.length - 1]);
  return result;
}

/**
 * Catmull-Rom spline interpolation for smooth natural curves through clicked points
 */
export function generateSmoothSpline(points: [number, number][], numSegments: number = 12): [number, number][] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    // Generate a natural soft river arc
    const p1 = points[0];
    const p2 = points[1];
    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    const len = Math.sqrt(dLat * dLat + dLng * dLng);
    const nLat = -dLng / (len || 1);
    const nLng = dLat / (len || 1);
    const arc: [number, number][] = [];
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const w = Math.sin(t * Math.PI) * (len * 0.15);
      arc.push([p1[0] + dLat * t + nLat * w, p1[1] + dLng * t + nLng * w]);
    }
    return arc;
  }

  const result: [number, number][] = [];

  // Pad endpoints
  const extended: [number, number][] = [
    points[0],
    ...points,
    points[points.length - 1]
  ];

  for (let i = 1; i < extended.length - 2; i++) {
    const p0 = extended[i - 1];
    const p1 = extended[i];
    const p2 = extended[i + 1];
    const p3 = extended[i + 2];

    for (let s = 0; s < numSegments; s++) {
      const t = s / numSegments;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom matrix coefficients
      const lat = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      );

      const lng = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      );

      result.push([Math.round(lat * 100000) / 100000, Math.round(lng * 100000) / 100000]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Calculates geodesic distance between two points in kilometers
 */
export function getDistanceBetweenPointsKm(p1: [number, number], p2: [number, number]): number {
  const lat1 = p1[0] * (Math.PI / 180);
  const lon1 = p1[1] * (Math.PI / 180);
  const lat2 = p2[0] * (Math.PI / 180);
  const lon2 = p2[1] * (Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/**
 * Sanitizes river track coordinates:
 * 1. Normalizes varied formats ([lat, lng] or {lat, lng})
 * 2. Removes consecutive identical duplicates
 * 3. Strips artificial loop-closure straight lines (when the last point jumps back to the start point)
 * 4. Ensures only genuine loaded river points and track are preserved as-is.
 */
export function cleanRiverTrackCoordinates(rawCoords: any): [number, number][] {
  if (!Array.isArray(rawCoords) || rawCoords.length === 0) return [];

  // 1. Normalize points
  const normalized: [number, number][] = [];
  for (const c of rawCoords) {
    if (Array.isArray(c) && c.length >= 2) {
      const lat = Number(c[0]);
      const lng = Number(c[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        normalized.push([lat, lng]);
      }
    } else if (c && typeof c === 'object' && 'lat' in c && 'lng' in c) {
      const lat = Number(c.lat);
      const lng = Number(c.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        normalized.push([lat, lng]);
      }
    }
  }

  if (normalized.length < 2) return normalized;

  // 2. Remove consecutive micro-duplicate points (< 1 meter)
  const deduped: [number, number][] = [normalized[0]];
  for (let i = 1; i < normalized.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = normalized[i];
    if (Math.abs(prev[0] - curr[0]) > 0.000005 || Math.abs(prev[1] - curr[1]) > 0.000005) {
      deduped.push(curr);
    }
  }

  if (deduped.length < 4) return deduped;

  // 3. Detect and remove artificial straight line loop closures back to the start
  // In many GPX/KML files, software appends the first point to the end to close a polygon or route,
  // creating a long straight line across land from the finish point back to the start point.
  let coords = [...deduped];

  while (coords.length >= 4) {
    const n = coords.length;
    const startPt = coords[0];
    const lastPt = coords[n - 1];
    const prevPt = coords[n - 2];

    const distLastToStart = getDistanceBetweenPointsKm(lastPt, startPt);
    const stepFromPrev = getDistanceBetweenPointsKm(prevPt, lastPt);
    const prevDistToStart = getDistanceBetweenPointsKm(prevPt, startPt);

    // If the step from second-to-last to last point is a huge leap (> 2.5 km)
    // AND the last point is right back at start (< 1.5 km from start),
    // while the previous point was far downriver (> 4 km from start),
    // this last point is an artificial straight return line!
    if (distLastToStart < 1.5 && stepFromPrev > 2.5 && prevDistToStart > 4.0) {
      coords.pop();
    } else {
      break;
    }
  }

  return coords;
}

/**
 * Calculates accurate geodesic path distance along all river bends
 */
export function calculateRiverTrackDistanceKm(coords: [number, number][]): number {
  let totalKm = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = coords[i][0] * (Math.PI / 180);
    const lon1 = coords[i][1] * (Math.PI / 180);
    const lat2 = coords[i + 1][0] * (Math.PI / 180);
    const lon2 = coords[i + 1][1] * (Math.PI / 180);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = 6371 * c; // Earth radius in km
    totalKm += d;
  }
  return Math.round(totalKm * 10) / 10;
}
