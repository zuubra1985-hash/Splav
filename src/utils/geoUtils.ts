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
