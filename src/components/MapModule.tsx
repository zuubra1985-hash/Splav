import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RiverRoute, VesselType, RoutePOI, AppUser } from '../types';
import { 
  Layers, 
  Compass, 
  Download, 
  ShieldAlert, 
  Eye, 
  MapPin, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Waves, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  Navigation2, 
  List, 
  Map as MapIcon,
  UploadCloud,
  FileDown,
  FileUp,
  FileText,
  CheckCircle2,
  X,
  TrendingUp,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseGpxFile, generateGpxString, ParsedGpxResult } from '../utils/gpxParser';

type MapLayerType = 'satellite' | 'topomap' | 'osm' | 'dark';

interface MapModuleProps {
  routes: RiverRoute[];
  selectedRoute: RiverRoute | null;
  currentUser?: AppUser | null;
  onSelectRoute: (route: RiverRoute | null) => void;
  onOpenRouteDetails: (route: RiverRoute) => void;
  onAddRoute?: (newRoute: RiverRoute) => void;
  onOpenPassportEditor?: (route?: RiverRoute) => void;
}

// Helper to safely extract [lat, lng] array from any coordinate representation
const normalizeRouteCoordinates = (coords: any): [number, number][] => {
  if (!Array.isArray(coords)) return [];
  return coords.map((c) => {
    if (Array.isArray(c) && c.length >= 2) return [Number(c[0]), Number(c[1])] as [number, number];
    if (c && typeof c === 'object' && 'lat' in c && 'lng' in c) return [Number(c.lat), Number(c.lng)] as [number, number];
    return null;
  }).filter((c): c is [number, number] => c !== null && !isNaN(c[0]) && !isNaN(c[1]));
};

export const MapModule: React.FC<MapModuleProps> = ({
  routes,
  selectedRoute,
  currentUser,
  onSelectRoute,
  onOpenRouteDetails,
  onAddRoute,
  onOpenPassportEditor
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const poiLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const importedGpxLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gpxFileInputRef = useRef<HTMLInputElement>(null);

  // Mobile View Switcher: 'list' or 'map'
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVessel, setSelectedVessel] = useState<VesselType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeBaseLayer, setActiveBaseLayer] = useState<MapLayerType>('satellite');

  // Imported GPX State
  const [importedGpx, setImportedGpx] = useState<ParsedGpxResult | null>(null);
  const [gpxImportError, setGpxImportError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isSavedToCatalog, setIsSavedToCatalog] = useState<boolean>(false);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [64.5, 66.0], // Center of Yugra and Yamal
        zoom: 6,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      polylineLayerGroupRef.current = L.layerGroup().addTo(map);
      poiLayerGroupRef.current = L.layerGroup().addTo(map);
      importedGpxLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Handle map invalidateSize on mobile view toggle or window resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [mobileView]);

  // 2. Base Tile Layers switcher
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let attribution = '&copy; Esri &mdash; Earthstar Geographics';

    if (activeBaseLayer === 'topomap') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap';
    } else if (activeBaseLayer === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    } else if (activeBaseLayer === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; CARTO &copy; OpenStreetMap';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18
    }).addTo(map);
  }, [activeBaseLayer]);

  // 3. Render Routes and POIs along real riverbeds
  useEffect(() => {
    if (!mapInstanceRef.current || !polylineLayerGroupRef.current || !poiLayerGroupRef.current) return;
    const map = mapInstanceRef.current;
    const polyGroup = polylineLayerGroupRef.current;
    const poiGroup = poiLayerGroupRef.current;

    polyGroup.clearLayers();
    poiGroup.clearLayers();

    // Filter routes
    const filteredRoutes = routes.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.riverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchVessel = selectedVessel === 'all' || r.recommendedVessels.includes(selectedVessel);
      const matchDiff = selectedDifficulty === 'all' || r.fstrCategory === selectedDifficulty;
      return matchSearch && matchVessel && matchDiff;
    });

    filteredRoutes.forEach((route) => {
      const isSelected = selectedRoute?.id === route.id;
      const normCoords = normalizeRouteCoordinates(route.coordinates);
      if (normCoords.length === 0) return;
      
      // River Channel Polyline (smooth, following meanders)
      const line = L.polyline(normCoords as L.LatLngExpression[], {
        color: isSelected ? '#E54B4B' : (route.region === 'ЯНАО' ? '#2B4C7E' : '#2D5A27'),
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1 : 0.85,
        smoothFactor: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Background glow for selected river
      if (isSelected) {
        const glowLine = L.polyline(normCoords as L.LatLngExpression[], {
          color: '#E54B4B',
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        });
        polyGroup.addLayer(glowLine);
      }

      // Interactive popup
      const popupHtml = `
        <div style="font-family: Inter, sans-serif; min-width: 180px;">
          <div style="font-size: 10px; font-weight: 700; color: #8B7E6D; text-transform: uppercase;">
            ${route.region} • ФСТР ${route.fstrCategory} (${route.intlClass})
          </div>
          <h4 style="margin: 3px 0 6px 0; font-size: 14px; font-weight: 800; color: #1A1F1A;">
            ${route.name}
          </h4>
          <div style="font-size: 11px; color: #4A443E; margin-bottom: 6px;">
            Русло: <b>${route.lengthKm} км</b> | Дней: <b>${route.durationDays}</b> | Течение: <b>${route.avgFlowSpeedKmh} км/ч</b>
          </div>
          <div style="font-size: 11px; color: #6B665F; line-height: 1.3; margin-bottom: 8px;">
            ${route.shortDesc}
          </div>
          <button id="btn-popup-${route.id}" style="
            width: 100%;
            background-color: #2D5A27;
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 8px 12px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
          ">
            Открыть паспорт реки и локацию →
          </button>
        </div>
      `;

      line.bindPopup(popupHtml);

      line.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${route.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRoute(route);
            onOpenRouteDetails(route);
          };
        }
      });

      line.on('click', () => {
        onSelectRoute(route);
      });

      polyGroup.addLayer(line);

      // Start / End Point Markers
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div style="
            background-color: #2D5A27;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          ">
            S
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const endIcon = L.divIcon({
        className: 'custom-end-marker',
        html: `
          <div style="
            background-color: #E54B4B;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          ">
            F
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      // Start / End Point Markers
      if (route.startPoint && route.startPoint.lat != null && route.startPoint.lng != null && !isNaN(Number(route.startPoint.lat)) && !isNaN(Number(route.startPoint.lng))) {
        const startMarker = L.marker([Number(route.startPoint.lat), Number(route.startPoint.lng)], { icon: startIcon })
          .bindTooltip(`Старт: ${route.startPoint.name || 'Точка старта'}`, { className: 'leaflet-dark-tooltip', direction: 'top' });
        poiGroup.addLayer(startMarker);
      }

      if (route.endPoint && route.endPoint.lat != null && route.endPoint.lng != null && !isNaN(Number(route.endPoint.lat)) && !isNaN(Number(route.endPoint.lng))) {
        const endMarker = L.marker([Number(route.endPoint.lat), Number(route.endPoint.lng)], { icon: endIcon })
          .bindTooltip(`Финиш: ${route.endPoint.name || 'Точка финиша'}`, { className: 'leaflet-dark-tooltip', direction: 'top' });
        poiGroup.addLayer(endMarker);
      }

      // Render POIs
      if ((isSelected || routes.length <= 4) && Array.isArray(route.pois)) {
        route.pois.forEach((poi) => {
          if (poi.lat == null || poi.lng == null || isNaN(Number(poi.lat)) || isNaN(Number(poi.lng))) return;
          let poiColor = '#2B4C7E';
          let emoji = '📍';
          if (poi.type === 'rapid') { poiColor = '#E54B4B'; emoji = '🌊'; }
          if (poi.type === 'camp') { poiColor = '#2D5A27'; emoji = '⛺'; }
          if (poi.type === 'hydro_post') { poiColor = '#2B4C7E'; emoji = '💧'; }
          if (poi.type === 'cabin') { poiColor = '#8B5A2B'; emoji = '🏠'; }
          if (poi.type === 'indigenous') { poiColor = '#8B7E6D'; emoji = '🏕️'; }
          if (poi.type === 'slipway') { poiColor = '#2D5A27'; emoji = '🛶'; }

          const poiIcon = L.divIcon({
            className: 'custom-poi-marker',
            html: `
              <div style="
                background-color: ${poiColor};
                color: white;
                border: 2px solid white;
                border-radius: 12px;
                padding: 2px 5px;
                display: flex;
                align-items: center;
                gap: 3px;
                font-size: 11px;
                font-weight: 700;
                box-shadow: 0 4px 10px rgba(0,0,0,0.25);
                white-space: nowrap;
              ">
                <span>${emoji}</span>
                <span style="font-size: 9px; font-family: Inter, sans-serif;">${poi.kmMark !== undefined ? `${poi.kmMark}k` : ''}</span>
              </div>
            `,
            iconSize: [44, 24],
            iconAnchor: [22, 12]
          });

          const m = L.marker([Number(poi.lat), Number(poi.lng)], { icon: poiIcon });
          m.bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 170px; max-width: 240px;">
              ${poi.photo ? `<img src="${poi.photo}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 10px; margin-bottom: 6px; border: 1px solid #E5E0D8;" />` : ''}
              <span style="font-size: 9px; font-weight: 800; color: ${poiColor}; text-transform: uppercase;">
                ${poi.type.toUpperCase()} • ${poi.kmMark ? `${poi.kmMark} км` : ''}
              </span>
              <h5 style="margin: 2px 0 4px 0; font-size: 13px; font-weight: 800; color: #1A1F1A;">
                ${poi.name}
              </h5>
              <p style="font-size: 11px; color: #4A443E; margin: 0 0 4px 0; line-height: 1.35;">
                ${poi.description}
              </p>
              ${poi.safetyTips ? `<div style="font-size: 10px; color: #E54B4B; font-weight: 600; margin-top: 3px;">⚠️ ${poi.safetyTips}</div>` : ''}
            </div>
          `);
          poiGroup.addLayer(m);
        });
      }
    });

    // Auto fit bounds if route selected
    if (selectedRoute) {
      try {
        const normCoords = normalizeRouteCoordinates(selectedRoute.coordinates);
        if (normCoords.length > 0) {
          const bounds = L.latLngBounds(normCoords as L.LatLngExpression[]);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
          }
        }
      } catch (err) {
        console.warn('Could not fit bounds for route:', err);
      }
    }
  }, [routes, selectedRoute, searchQuery, selectedVessel, selectedDifficulty]);

  // 3. RENDER IMPORTED GPX ON MAP
  useEffect(() => {
    if (!mapInstanceRef.current || !importedGpxLayerGroupRef.current) return;
    const gpxGroup = importedGpxLayerGroupRef.current;
    gpxGroup.clearLayers();

    if (!importedGpx) return;

    // Glowing outline
    const glow = L.polyline(importedGpx.coordinates as L.LatLngExpression[], {
      color: '#FFFFFF',
      weight: 10,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    });
    gpxGroup.addLayer(glow);

    // Vivid GPX track line
    const gpxLine = L.polyline(importedGpx.coordinates as L.LatLngExpression[], {
      color: '#EA580C', // Deep amber / orange for imported track
      weight: 5,
      opacity: 0.95,
      smoothFactor: 1.0,
      lineCap: 'round',
      lineJoin: 'round'
    });
    gpxGroup.addLayer(gpxLine);

    // Start Marker
    if (importedGpx.coordinates.length > 0) {
      const startIcon = L.divIcon({
        className: 'gpx-start-marker',
        html: `
          <div style="
            background: #2D5A27;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">
            🚩
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const startMarker = L.marker(importedGpx.coordinates[0] as L.LatLngExpression, { icon: startIcon })
        .bindTooltip(`Старт GPX: ${importedGpx.startPoint.name}`, { className: 'leaflet-dark-tooltip', direction: 'top' });
      gpxGroup.addLayer(startMarker);
    }

    // Finish Marker
    if (importedGpx.coordinates.length > 1) {
      const finishIcon = L.divIcon({
        className: 'gpx-finish-marker',
        html: `
          <div style="
            background: #E54B4B;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">
            🏁
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const endMarker = L.marker(importedGpx.coordinates[importedGpx.coordinates.length - 1] as L.LatLngExpression, { icon: finishIcon })
        .bindTooltip(`Финиш GPX: ${importedGpx.totalDistanceKm} км`, { className: 'leaflet-dark-tooltip', direction: 'top' });
      gpxGroup.addLayer(endMarker);
    }

    // Waypoints (<wpt>)
    importedGpx.waypoints.forEach((wpt) => {
      const wptIcon = L.divIcon({
        className: 'gpx-wpt-marker',
        html: `
          <div style="
            background: #2563EB;
            color: white;
            border: 2px solid white;
            border-radius: 12px;
            padding: 2px 6px;
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            white-space: nowrap;
          ">
            <span>📍</span>
            <span>${wpt.name}</span>
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12]
      });

      const m = L.marker([wpt.lat, wpt.lng], { icon: wptIcon });
      m.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 160px;">
          <span style="font-size: 10px; font-weight: 800; color: #2563EB; text-transform: uppercase;">
            Точка из GPX
          </span>
          <h5 style="margin: 3px 0; font-size: 13px; font-weight: 800; color: #1A1F1A;">${wpt.name}</h5>
          <p style="font-size: 11px; color: #4A443E; margin: 0;">${wpt.description}</p>
        </div>
      `);
      gpxGroup.addLayer(m);
    });

    // Auto fit map to imported track
    const bounds = L.latLngBounds(importedGpx.coordinates as L.LatLngExpression[]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

  }, [importedGpx]);

  // Handle GPX File Selection & Parsing
  const handleGpxFileUpload = (file: File) => {
    setGpxImportError(null);
    setIsSavedToCatalog(false);

    if (!file.name.match(/\.(gpx|kml|xml)$/i)) {
      setGpxImportError('Поддерживаются только файлы форматов .gpx, .kml или .xml');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Файл пуст');

        const parsed = parseGpxFile(text, file.name);
        setImportedGpx(parsed);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (err: any) {
        setGpxImportError(err.message || 'Ошибка парсинга GPX файла. Проверьте валидность XML.');
      }
    };
    reader.onerror = () => {
      setGpxImportError('Не удалось прочитать файл с устройства.');
    };
    reader.readAsText(file);
  };

  const handleSaveImportedRouteAsPermanent = () => {
    if (!importedGpx) return;

    const newRoute: RiverRoute = {
      id: `custom-gpx-${Date.now()}`,
      name: importedGpx.name,
      riverName: importedGpx.name,
      region: (importedGpx.coordinates[0]?.[0] || 62) > 65.5 ? 'ЯНАО' : 'ХМАО',
      fstrCategory: 'I к.с.',
      intlClass: 'Class I',
      lengthKm: importedGpx.totalDistanceKm,
      durationDays: Math.max(1, Math.ceil(importedGpx.totalDistanceKm / 25)),
      recommendedVessels: ['sup', 'kayak', 'catamaran'],
      startPoint: importedGpx.startPoint,
      endPoint: importedGpx.endPoint,
      coordinates: importedGpx.coordinates,
      elevationGainM: importedGpx.elevationGainM || 50,
      avgFlowSpeedKmh: 3.5,
      seasonMonths: 'Июнь — Сентябрь',
      description: importedGpx.description,
      shortDesc: `Импортированный GPX трек (${importedGpx.totalDistanceKm} км, перепад ${importedGpx.elevationGainM} м).`,
      highlights: ['Импортировано из GPS навигатора', 'Фактический пройденный трек'],
      warnings: ['Проверьте уровень воды и гидрологическую обстановку'],
      mchsRegistrationRequired: true,
      kmnsPermitNeeded: false,
      coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      elevationProfile: importedGpx.elevationPoints.map((ep) => ({
        distanceKm: ep.distKm,
        elevationM: ep.elev
      })),
      gpxFileName: `${importedGpx.name.toLowerCase().replace(/\s+/g, '_')}_splav86.gpx`,
      pois: importedGpx.waypoints.length > 0 ? importedGpx.waypoints : [
        {
          id: `poi-st-${Date.now()}`,
          name: 'Точка старта',
          type: 'slipway',
          lat: importedGpx.startPoint.lat,
          lng: importedGpx.startPoint.lng,
          description: 'Удобное место для сборки и спуска судов на воду'
        },
        {
          id: `poi-fn-${Date.now()}`,
          name: 'Точка финиша',
          type: 'slipway',
          lat: importedGpx.endPoint.lat,
          lng: importedGpx.endPoint.lng,
          description: 'Место антистапеля и подъезда транспорта'
        }
      ]
    };

    if (onAddRoute) {
      onAddRoute(newRoute);
    }
    onSelectRoute(newRoute);
    setIsSavedToCatalog(true);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
  };

  const handleExportImportedGpx = () => {
    if (!importedGpx) return;
    const tempRoute: RiverRoute = {
      id: `export-${Date.now()}`,
      name: importedGpx.name,
      riverName: importedGpx.name,
      region: 'ХМАО',
      fstrCategory: 'I к.с.',
      intlClass: 'Class I',
      lengthKm: importedGpx.totalDistanceKm,
      durationDays: 3,
      recommendedVessels: ['kayak'],
      startPoint: importedGpx.startPoint,
      endPoint: importedGpx.endPoint,
      coordinates: importedGpx.coordinates,
      elevationGainM: importedGpx.elevationGainM,
      avgFlowSpeedKmh: 3.5,
      seasonMonths: 'Лето',
      description: importedGpx.description,
      shortDesc: importedGpx.description,
      highlights: [],
      warnings: [],
      mchsRegistrationRequired: false,
      kmnsPermitNeeded: false,
      coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      elevationProfile: [],
      gpxFileName: `${importedGpx.name.toLowerCase().replace(/\s+/g, '_')}_splav86.gpx`,
      pois: importedGpx.waypoints
    };

    const gpxText = generateGpxString(tempRoute);
    const blob = new Blob([gpxText], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importedGpx.name.toLowerCase().replace(/\s+/g, '_')}_splav86.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearImportedGpx = () => {
    setImportedGpx(null);
    setGpxImportError(null);
    setIsSavedToCatalog(false);
    if (importedGpxLayerGroupRef.current) {
      importedGpxLayerGroupRef.current.clearLayers();
    }
  };

  const filteredList = routes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.riverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchVessel = selectedVessel === 'all' || r.recommendedVessels.includes(selectedVessel);
    const matchDiff = selectedDifficulty === 'all' || r.fstrCategory === selectedDifficulty;
    return matchSearch && matchVessel && matchDiff;
  });

  return (
    <div 
      className="relative w-full h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] flex flex-col md:flex-row overflow-hidden bg-[#F5F2ED]"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleGpxFileUpload(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Hidden GPX File Input */}
      <input
        type="file"
        ref={gpxFileInputRef}
        accept=".gpx,.kml,.xml"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleGpxFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-[3000] bg-[#2D5A27]/90 text-white flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-fade-in border-4 border-dashed border-white">
          <UploadCloud className="w-16 h-16 mb-3 animate-bounce" />
          <h3 className="text-xl font-black">Отпустите GPX файл для импорта</h3>
          <p className="text-sm text-[#E8F1E7] mt-1">Трек сразу отобразится на интерактивной карте рек</p>
        </div>
      )}
      
      {/* Mobile Top View Switcher (List vs Map) */}
      <div className="md:hidden flex items-center justify-between p-2.5 bg-white border-b border-[#E5E0D8] z-20 shrink-0">
        <div className="flex items-center gap-1 bg-[#F9F7F4] p-1 rounded-xl border border-[#EEEBE6] w-full">
          <button
            onClick={() => setMobileView('map')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileView === 'map'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'text-[#6B665F]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Интерактивная карта</span>
          </button>
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileView === 'list'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'text-[#6B665F]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Каталог рек ({filteredList.length})</span>
          </button>
        </div>
      </div>

      {/* Routes Explorer Sidebar (Desktop: always visible / Mobile: conditional based on mobileView) */}
      <aside className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-[#E5E0D8] flex flex-col z-10 shadow-sm shrink-0 ${
        mobileView === 'list' ? 'flex flex-1 pb-20 md:pb-0' : 'hidden md:flex'
      }`}>
        
        {/* Search & Filter Header */}
        <div className="p-3 sm:p-4 border-b border-[#E5E0D8] space-y-2.5 bg-[#F9F7F4]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8B7E6D]" />
            <input
              type="text"
              placeholder="Поиск реки (Собь, Сосьва, Тромъёган...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] placeholder-[#8B7E6D] outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] transition-all shadow-inner"
            />
          </div>

          {/* Quick Actions: GPX Import & Create River Passport (Admins Only) */}
          {isAdmin && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => gpxFileInputRef.current?.click()}
                className="py-2 px-2.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                title="Загрузить GPX трек с навигатора"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Импорт GPX</span>
              </button>

              {onOpenPassportEditor && (
                <button
                  type="button"
                  onClick={() => onOpenPassportEditor()}
                  className="py-2 px-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  title="Составить новый паспорт реки"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Паспорт реки</span>
                </button>
              )}
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value as VesselType | 'all')}
              className="bg-white border border-[#E5E0D8] text-[#2D332D] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#2D5A27] shrink-0"
            >
              <option value="all">Все суда</option>
              <option value="sup">🏄‍♂️ SUP-борды</option>
              <option value="kayak">🛶 Байдарки / Каяки</option>
              <option value="catamaran">⛵ Катамараны</option>
              <option value="raft">🚣 Рафты</option>
              <option value="motorboat">🚤 Моторные лодки</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white border border-[#E5E0D8] text-[#2D332D] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#2D5A27] shrink-0"
            >
              <option value="all">Любая к.с.</option>
              <option value="I к.с.">I категория</option>
              <option value="II к.с.">II категория</option>
              <option value="III к.с.">III категория</option>
              <option value="IV к.с.">IV категория</option>
            </select>
          </div>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-[#8B7E6D] font-bold uppercase tracking-wider">
            <span>Маршруты по руслам ({filteredList.length})</span>
            <span>ФСТР / Русло</span>
          </div>

          {filteredList.map((route) => {
            const isSelected = selectedRoute?.id === route.id;

            return (
              <div
                key={route.id}
                onClick={() => {
                  onSelectRoute(route);
                  if (window.innerWidth < 768) {
                    setMobileView('map');
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-[#E8F1E7]/40 border-[#2D5A27] ring-1 ring-[#2D5A27]/30 shadow-xs'
                    : 'bg-[#F9F7F4] border-[#EEEBE6] hover:bg-white hover:border-[#D9D1C5]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                        {route.region}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#2D5A27] text-white">
                        {route.fstrCategory}
                      </span>
                      <span className="text-[10px] text-[#8B7E6D]">
                        {route.intlClass}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1F1A] mt-1 group-hover:text-[#2D5A27] transition-colors">
                      {route.name}
                    </h3>
                  </div>

                  <span className="text-xs font-black text-[#2D5A27] shrink-0">
                    {route.lengthKm} км
                  </span>
                </div>

                <p className="text-xs text-[#6B665F] mt-1.5 line-clamp-2 leading-relaxed">
                  {route.shortDesc}
                </p>

                {/* Key stats row */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E5E0D8]/60 text-[11px] text-[#8B7E6D]">
                  <div className="flex items-center gap-2.5">
                    <span>⏱ {route.durationDays} дн.</span>
                    <span>🌊 {route.avgFlowSpeedKmh} км/ч</span>
                    <span>⛰️ {route.elevationGainM} м</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoute(route);
                        onOpenRouteDetails(route);
                      }}
                      className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center gap-1 transition-all"
                    >
                      Локация
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </aside>

      {/* Main Leaflet Map Viewport (Mobile: conditional based on mobileView / Desktop: full flex-1) */}
      <div className={`flex-1 relative h-full ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
        
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Top-Right Map Controls */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[1000] flex items-center gap-2">
          {/* GPX Import Quick Button (Admins Only) */}
          {isAdmin && (
            <button
              onClick={() => gpxFileInputRef.current?.click()}
              className="px-2.5 sm:px-3 py-1.5 bg-white/95 backdrop-blur-md text-[#2D5A27] hover:bg-[#E8F1E7] border border-[#E5E0D8] rounded-xl sm:rounded-2xl shadow-md text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Импорт GPX / KML трека с навигатора"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span className="hidden sm:inline">Импорт GPX</span>
              <span className="sm:hidden">GPX</span>
            </button>
          )}

          {/* Layer Selector */}
          <div className="flex items-center bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-[#E5E0D8] shadow-md space-x-0.5 sm:space-x-1">
            <button
              onClick={() => setActiveBaseLayer('satellite')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all ${
                activeBaseLayer === 'satellite'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              Спутник
            </button>
            <button
              onClick={() => setActiveBaseLayer('topomap')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all ${
                activeBaseLayer === 'topomap'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              Рельеф
            </button>
            <button
              onClick={() => setActiveBaseLayer('osm')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all ${
                activeBaseLayer === 'osm'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27]'
              }`}
            >
              OSM
            </button>
          </div>
        </div>

        {/* GPX Error Notification */}
        {gpxImportError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-[#FDE8E8] border border-[#F8B4B4] text-[#E54B4B] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{gpxImportError}</span>
            <button onClick={() => setGpxImportError(null)} className="ml-auto text-[#E54B4B] hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating GPX Track Info Card */}
        {importedGpx && (
          <div className="absolute top-16 sm:top-18 left-3 right-3 md:left-auto md:right-4 z-[1000] bg-white/95 backdrop-blur-md border border-[#E5E0D8] rounded-[24px] p-4 shadow-xl max-w-md space-y-3 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#EA580C] flex items-center justify-center font-black">
                  <Navigation2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-[#FFEDD5] text-[#C2410C]">
                      GPX ТРЕК НА КАРТЕ
                    </span>
                    {isSavedToCatalog && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Сохранено
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-[#1A1F1A] mt-0.5 line-clamp-1">
                    {importedGpx.name}
                  </h4>
                </div>
              </div>

              <button
                onClick={clearImportedGpx}
                className="p-1 rounded-lg text-[#8B7E6D] hover:text-[#2D332D] hover:bg-[#F9F7F4]"
                title="Закрыть трек"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 bg-[#F9F7F4] p-2.5 rounded-xl border border-[#EEEBE6] text-center">
              <div>
                <span className="text-[10px] text-[#8B7E6D] font-bold block">Дистанция</span>
                <span className="text-xs font-black text-[#1A1F1A]">{importedGpx.totalDistanceKm} км</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8B7E6D] font-bold block">Перепад высот</span>
                <span className="text-xs font-black text-[#2D5A27]">+{importedGpx.elevationGainM} м</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8B7E6D] font-bold block">Точек / POI</span>
                <span className="text-xs font-black text-[#1A1F1A]">
                  {importedGpx.coordinates.length} / {importedGpx.waypoints.length}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!isSavedToCatalog ? (
                <button
                  type="button"
                  onClick={handleSaveImportedRouteAsPermanent}
                  className="flex-1 py-2 px-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>В каталог рек</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 px-3 bg-[#E8F1E7] text-[#2D5A27] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>В базе маршрутов</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportImportedGpx}
                className="py-2 px-3 bg-[#F9F7F4] hover:bg-[#EAE6DF] text-[#2D332D] border border-[#E5E0D8] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                title="Экспорт чистого GPX"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>GPX</span>
              </button>

              <button
                type="button"
                onClick={clearImportedGpx}
                className="py-2 px-2.5 text-[#8B7E6D] hover:text-[#E54B4B] rounded-xl text-xs font-bold transition-all"
                title="Очистить с карты"
              >
                Убрать
              </button>
            </div>
          </div>
        )}

        {/* Selected Route Banner (Desktop) */}
        {selectedRoute && (
          <div className="absolute top-4 left-4 z-[1000] hidden md:flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#E5E0D8] shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E54B4B] animate-pulse" />
            <div className="text-xs">
              <span className="text-[#8B7E6D] font-medium block">Выбранное русло:</span>
              <strong className="text-[#1A1F1A]">{selectedRoute.name} ({selectedRoute.lengthKm} км)</strong>
            </div>
            <button
              onClick={() => onOpenRouteDetails(selectedRoute)}
              className="ml-2 px-3 py-1 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              Паспорт реки
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
