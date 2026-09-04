import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RoutePOI } from '../types';
import { MapPin, Navigation, Mountain, Download } from 'lucide-react';
import { generateGpxString } from '../utils/gpxParser';
import { cleanRiverTrackCoordinates } from '../utils/geoUtils';

interface TripRouteMiniMapProps {
  coordinates: [number, number][];
  startPoint?: { name: string; lat: number; lng: number };
  endPoint?: { name: string; lat: number; lng: number };
  waypoints?: RoutePOI[];
  routeName?: string;
  lengthKm?: number;
  elevationGainM?: number;
  heightClass?: string;
}

export const TripRouteMiniMap: React.FC<TripRouteMiniMapProps> = ({
  coordinates: rawCoordinates,
  startPoint,
  endPoint,
  waypoints = [],
  routeName = 'Маршрут сплава',
  lengthKm,
  elevationGainM,
  heightClass = 'h-64'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const coordinates = cleanRiverTrackCoordinates(rawCoordinates);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = coordinates.length > 0 ? coordinates[0] : [61.0, 69.0];
      
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 9,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (coordinates && coordinates.length > 0) {
      // 1. Draw Route Polyline
      const polyline = L.polyline(coordinates, {
        color: '#2D5A27',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 2. Start Marker
      const stLat = startPoint?.lat ?? coordinates[0][0];
      const stLng = startPoint?.lng ?? coordinates[0][1];
      const startIcon = L.divIcon({
        className: 'custom-trip-marker',
        html: `<div style="background-color: #2D5A27; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">🚩</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([stLat, stLng], { icon: startIcon })
        .bindPopup(`<b>Старт: ${startPoint?.name || 'Точка стапеля'}</b>`)
        .addTo(map);

      // 3. Finish Marker
      const fnLat = endPoint?.lat ?? coordinates[coordinates.length - 1][0];
      const fnLng = endPoint?.lng ?? coordinates[coordinates.length - 1][1];
      const endIcon = L.divIcon({
        className: 'custom-trip-marker',
        html: `<div style="background-color: #E54B4B; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">🏁</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([fnLat, fnLng], { icon: endIcon })
        .bindPopup(`<b>Финиш: ${endPoint?.name || 'Точка антистапеля'}</b>`)
        .addTo(map);

      // 4. Waypoints
      waypoints.forEach((wp) => {
        let emoji = '📍';
        if (wp.type === 'rapid') emoji = '🌊';
        if (wp.type === 'camp') emoji = '⛺';
        if (wp.type === 'cabin') emoji = '🏠';
        if (wp.type === 'danger') emoji = '⚠️';

        const wpIcon = L.divIcon({
          className: 'custom-trip-wpt',
          html: `<div style="background-color: white; border: 2px solid #2D5A27; color: #2D5A27; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">${emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .bindPopup(`<b>${wp.name}</b><br/><span style="font-size: 12px;">${wp.description}</span>`)
          .addTo(map);
      });

      // Fit bounds
      try {
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      } catch {
        map.setView([stLat, stLng], 9);
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // Keep map reference or cleanup
    };
  }, [coordinates, startPoint, endPoint, waypoints]);

  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#F9F7F4] shadow-xs flex flex-col">
      {/* Map Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-10`} />

      {/* Info bar below map */}
      <div className="p-3 bg-white border-t border-[#E5E0D8] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#1A1F1A] flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-[#2D5A27]" />
            {lengthKm ? `${lengthKm} км` : `${coordinates.length} точек трека`}
          </span>

          {elevationGainM !== undefined && (
            <span className="text-[#8B7E6D] flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-[#2D5A27]" />
              Перепад: {elevationGainM} м
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#6B665F]">
          <span className="flex items-center gap-1 font-medium">
            <span className="text-[#2D5A27] font-bold">🚩 Старт:</span> {startPoint?.name || 'Стапель'}
          </span>
          <span>→</span>
          <span className="flex items-center gap-1 font-medium">
            <span className="text-[#E54B4B] font-bold">🏁 Финиш:</span> {endPoint?.name || 'Антистапель'}
          </span>
        </div>
      </div>
    </div>
  );
};
