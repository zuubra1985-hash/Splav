import { RiverRoute, RoutePOI, RouteCoordinate } from '../types';
import { calculateRiverTrackDistanceKm, cleanRiverTrackCoordinates } from './geoUtils';

export interface ParsedGpxResult {
  name: string;
  description: string;
  coordinates: [number, number][]; // [lat, lng]
  elevationPoints: { lat: number; lng: number; elev: number; distKm: number }[];
  totalDistanceKm: number;
  elevationGainM: number;
  elevationMinM: number;
  elevationMaxM: number;
  startPoint: { name: string; lat: number; lng: number };
  endPoint: { name: string; lat: number; lng: number };
  waypoints: RoutePOI[];
}

/**
 * Parses GPX 1.0/1.1 or KML string into structured river track data.
 * Guarantees that track is rendered as-is and never loops or connects start/finish with a straight line.
 */
export function parseGpxFile(xmlText: string, fallbackFileName?: string): ParsedGpxResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for XML parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Некорректный XML формат GPX файла.');
  }

  // 1. Extract Name & Description
  let trackName = '';
  const nameNode = xmlDoc.querySelector('trk > name') || xmlDoc.querySelector('gpx > name') || xmlDoc.querySelector('rte > name') || xmlDoc.querySelector('name');
  if (nameNode && nameNode.textContent) {
    trackName = nameNode.textContent.trim();
  } else if (fallbackFileName) {
    trackName = fallbackFileName.replace(/\.(gpx|kml|xml)$/i, '').replace(/[-_]/g, ' ');
  } else {
    trackName = 'Импортированный водный трек';
  }

  let description = '';
  const descNode = xmlDoc.querySelector('trk > desc') || xmlDoc.querySelector('gpx > desc') || xmlDoc.querySelector('desc');
  if (descNode && descNode.textContent) {
    description = descNode.textContent.trim();
  }

  // 2. Extract Trackpoints & Routepoints without mixing them!
  // Priority: 1) <trkpt> (actual GPS track points), 2) <rtept> (route plan points), 3) KML <coordinates>
  const rawCoords: [number, number][] = [];
  const rawElevs: number[] = [];

  let ptNodes = xmlDoc.querySelectorAll('trkpt');
  if (ptNodes.length === 0) {
    ptNodes = xmlDoc.querySelectorAll('rtept');
  }

  let minElev = 99999;
  let maxElev = -99999;
  let elevGain = 0;
  let prevElev: number | null = null;

  if (ptNodes.length > 0) {
    ptNodes.forEach((node) => {
      const latStr = node.getAttribute('lat');
      const lonStr = node.getAttribute('lon');

      if (latStr && lonStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lonStr);

        if (!isNaN(lat) && !isNaN(lng)) {
          rawCoords.push([lat, lng]);

          // Elevation
          const eleNode = node.querySelector('ele');
          let elev = 0;
          if (eleNode && eleNode.textContent) {
            elev = parseFloat(eleNode.textContent);
            if (!isNaN(elev)) {
              if (elev < minElev) minElev = elev;
              if (elev > maxElev) maxElev = elev;

              if (prevElev !== null && elev > prevElev) {
                elevGain += (elev - prevElev);
              }
              prevElev = elev;
            }
          }
          rawElevs.push(isNaN(elev) ? 0 : Math.round(elev));
        }
      }
    });
  }

  // Fallback if no trkpt/rtept found: try KML <coordinates> tags
  if (rawCoords.length === 0) {
    const kmlCoords = xmlDoc.querySelectorAll('coordinates');
    kmlCoords.forEach((node) => {
      if (node.textContent) {
        const lines = node.textContent.trim().split(/\s+/);
        lines.forEach((line) => {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const elev = parts.length > 2 ? parseFloat(parts[2]) : 0;
            if (!isNaN(lat) && !isNaN(lng)) {
              rawCoords.push([lat, lng]);
              rawElevs.push(isNaN(elev) ? 0 : Math.round(elev));
            }
          }
        });
      }
    });
  }

  // Clean coordinates: remove duplicate points and strip artificial loop closures back to start
  const coordinates = cleanRiverTrackCoordinates(rawCoords);

  if (coordinates.length < 2) {
    throw new Error('В GPX файле не обнаружено точек трека (<trkpt> или <rtept>).');
  }

  // Build elevation points and cumulative distance on cleaned track
  const elevationPoints: { lat: number; lng: number; elev: number; distKm: number }[] = [];
  let currentDistKm = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const pt = coordinates[i];
    if (i > 0) {
      const prevCoord = coordinates[i - 1];
      const legKm = calculateRiverTrackDistanceKm([prevCoord, pt]);
      currentDistKm += legKm;
    }

    const elev = rawElevs[i] || 0;
    elevationPoints.push({
      lat: pt[0],
      lng: pt[1],
      elev,
      distKm: Math.round(currentDistKm * 10) / 10
    });
  }

  const totalDistanceKm = calculateRiverTrackDistanceKm(coordinates);

  // 3. Extract Waypoints (<wpt>)
  const waypoints: RoutePOI[] = [];
  const wptNodes = xmlDoc.querySelectorAll('wpt');
  
  wptNodes.forEach((node, idx) => {
    const latStr = node.getAttribute('lat');
    const lonStr = node.getAttribute('lon');
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        const wptName = node.querySelector('name')?.textContent?.trim() || `Точка ${idx + 1}`;
        const wptDesc = node.querySelector('desc')?.textContent?.trim() || '';
        const wptSym = node.querySelector('sym')?.textContent?.toLowerCase() || '';
        const wptType = node.querySelector('type')?.textContent?.toLowerCase() || '';

        // Infer POI type
        let type: RoutePOI['type'] = 'camp';
        const combined = `${wptName} ${wptDesc} ${wptSym} ${wptType}`.toLowerCase();

        if (combined.includes('порог') || combined.includes('rapid') || combined.includes('шивера') || combined.includes('слив')) {
          type = 'rapid';
        } else if (combined.includes('обнос') || combined.includes('portage') || combined.includes('завал') || combined.includes('плотина')) {
          type = 'portage';
        } else if (combined.includes('опасн') || combined.includes('danger') || combined.includes('камень')) {
          type = 'danger';
        } else if (combined.includes('изба') || combined.includes('зимовье') || combined.includes('cabin') || combined.includes('чум')) {
          type = 'cabin';
        } else if (combined.includes('стапель') || combined.includes('антистапель') || combined.includes('слип') || combined.includes('спуск')) {
          type = 'slipway';
        } else if (combined.includes('пост') || combined.includes('гидро') || combined.includes('hydro')) {
          type = 'hydro_post';
        } else if (combined.includes('кмно') || combined.includes('стойбище')) {
          type = 'indigenous';
        }

        waypoints.push({
          id: `wpt-imported-${idx}-${Date.now()}`,
          name: wptName,
          type,
          lat,
          lng,
          description: wptDesc || 'Импортированная точка из GPX навигатора'
        });
      }
    }
  });

  const startCoord = coordinates[0];
  const endCoord = coordinates[coordinates.length - 1];

  return {
    name: trackName,
    description: description || `Импортированный GPX трек (${totalDistanceKm} км).`,
    coordinates,
    elevationPoints,
    totalDistanceKm,
    elevationGainM: Math.round(elevGain),
    elevationMinM: minElev === 99999 ? 0 : Math.round(minElev),
    elevationMaxM: maxElev === -99999 ? 0 : Math.round(maxElev),
    startPoint: {
      name: 'Старт трека',
      lat: startCoord[0],
      lng: startCoord[1]
    },
    endPoint: {
      name: 'Финиш трека',
      lat: endCoord[0],
      lng: endCoord[1]
    },
    waypoints
  };
}

/**
 * Converts a RiverRoute or array of coordinates to valid GPX 1.1 XML string
 */
export function generateGpxString(route: RiverRoute): string {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Splav86.ru - Водный туризм ХМАО и ЯНАО" 
  xmlns="http://www.topografix.com/GPX/1/1" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <desc>${escapeXml(route.shortDesc || route.description)}</desc>
    <author>
      <name>Сплав86</name>
      <link href="https://splav86.ru"/>
    </author>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

  // Waypoints (POIs)
  let wptXml = '';
  if (route.pois && route.pois.length > 0) {
    route.pois.forEach((poi) => {
      wptXml += `\n  <wpt lat="${poi.lat}" lon="${poi.lng}">
    <name>${escapeXml(poi.name)}</name>
    <desc>${escapeXml(poi.description)}</desc>
    <sym>${poi.type}</sym>
    <type>${poi.type}</type>
  </wpt>`;
    });
  }

  // Start and End waypoints
  if (route.startPoint) {
    wptXml += `\n  <wpt lat="${route.startPoint.lat}" lon="${route.startPoint.lng}">
    <name>СТАРТ: ${escapeXml(route.startPoint.name)}</name>
    <sym>Flag, Green</sym>
  </wpt>`;
  }

  if (route.endPoint) {
    wptXml += `\n  <wpt lat="${route.endPoint.lat}" lon="${route.endPoint.lng}">
    <name>ФИНИШ: ${escapeXml(route.endPoint.name)}</name>
    <sym>Flag, Red</sym>
  </wpt>`;
  }

  // Track & Trackpoints
  let trkXml = `\n  <trk>
    <name>${escapeXml(route.name)}</name>
    <desc>Категория: ${route.fstrCategory}, Протяженность: ${route.lengthKm} км, Регион: ${route.region}</desc>
    <trkseg>`;

  if (Array.isArray(route.coordinates)) {
    route.coordinates.forEach((coord: any) => {
      let lat: number | undefined;
      let lng: number | undefined;
      if (Array.isArray(coord) && coord.length >= 2) {
        lat = Number(coord[0]);
        lng = Number(coord[1]);
      } else if (coord && typeof coord === 'object') {
        lat = Number(coord.lat);
        lng = Number(coord.lng);
      }
      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        trkXml += `\n      <trkpt lat="${lat}" lon="${lng}"></trkpt>`;
      }
    });
  }

  trkXml += `\n    </trkseg>
  </trk>`;

  const gpxFooter = `\n</gpx>`;

  return gpxHeader + wptXml + trkXml + gpxFooter;
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
