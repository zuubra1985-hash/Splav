import React, { useState, useRef } from 'react';
import { RiverRoute, RoutePOI, VesselType } from '../types';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  UploadCloud, 
  MapPin, 
  Compass, 
  ShieldAlert, 
  Waves, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Camera, 
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Edit3,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Upload,
  RotateCcw,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseGpxFile } from '../utils/gpxParser';
import { compressImageFile } from '../utils/imageCompressor';

interface RiverPassportEditorModalProps {
  initialRoute?: RiverRoute | null;
  onSave: (savedRoute: RiverRoute) => void;
  onClose: () => void;
}

const PRESET_COVERS = [
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80', label: 'Северная река и сопки' },
  { url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80', label: 'Таежный перекат' },
  { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=80', label: 'Горный каньон' },
  { url: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=1000&q=80', label: 'Тундровое русло' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80', label: 'Таежный закат над рекой' }
];

export const RiverPassportEditorModal: React.FC<RiverPassportEditorModalProps> = ({
  initialRoute,
  onSave,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'geography' | 'lotia' | 'logistics' | 'safety' | 'media'>('general');
  const gpxFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const newPoiPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPoiPhotoInputRef = useRef<HTMLInputElement>(null);

  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<RiverRoute>(() => {
    if (initialRoute) {
      return JSON.parse(JSON.stringify(initialRoute));
    }
    return {
      id: `route-custom-${Date.now()}`,
      name: '',
      riverName: '',
      riverBasin: 'Бассейн реки Обь',
      region: 'ХМАО',
      fstrCategory: 'I к.с.',
      intlClass: 'Class I',
      lengthKm: 45,
      durationDays: 3,
      recommendedVessels: ['kayak', 'sup', 'catamaran'],
      startPoint: { name: 'Точка старта (стапель)', lat: 61.0, lng: 69.0 },
      endPoint: { name: 'Точка финиша (антистапель)', lat: 61.3, lng: 69.4 },
      coordinates: [
        [61.0, 69.0],
        [61.15, 69.2],
        [61.3, 69.4]
      ],
      elevationGainM: 35,
      avgFlowSpeedKmh: 3.5,
      seasonMonths: 'Июнь — Сентябрь',
      description: '',
      shortDesc: '',
      highlights: ['Чистейшая северная вода', 'Удобные стоянки в сосновом бору'],
      warnings: ['Встречаются скрытые коряжники и топляки на поворотах'],
      mchsRegistrationRequired: true,
      kmnsPermitNeeded: false,
      coverImage: PRESET_COVERS[0].url,
      photos: [],
      pois: [
        {
          id: `poi-st-${Date.now()}`,
          name: 'Стапель у моста',
          type: 'slipway',
          lat: 61.0,
          lng: 69.0,
          kmMark: 0,
          description: 'Удобный пологий берег для сборки байдарок и спуска на воду'
        },
        {
          id: `poi-fn-${Date.now()}`,
          name: 'Антистапель',
          type: 'slipway',
          lat: 61.3,
          lng: 69.4,
          kmMark: 45,
          description: 'Площадка для разборки судов и подъезда автотранспорта'
        }
      ],
      elevationProfile: [
        { distanceKm: 0, elevationM: 85, pointName: 'Старт' },
        { distanceKm: 45, elevationM: 50, pointName: 'Финиш' }
      ],
      gpxFileName: 'river_passport.gpx',
      logisticsTransfer: {
        accessIn: 'Доставка автомобилем повышенной проходимости от ж/д станции.',
        accessOut: 'Выезд на рейсовом автобусе или заказном микроавтобусе.',
        transportContacts: 'Диспетчер заброски: +7 (900) 000-00-00'
      },
      recommendedGear: [
        'Сертифицированный спасательный жилет',
        'Гермомешки (40-80 л)',
        'Неопреновые боты / перчатки',
        'Спутниковый трекер или рация'
      ],
      authorName: 'Водный турист Югры',
      lastPassportRevision: new Date().toISOString().split('T')[0]
    };
  });

  const [newHighlight, setNewHighlight] = useState('');
  const [newWarning, setNewWarning] = useState('');
  const [newGearItem, setNewGearItem] = useState('');

  // Editing POI modal / state
  const [editingPoi, setEditingPoi] = useState<RoutePOI | null>(null);
  const [newPoi, setNewPoi] = useState<Partial<RoutePOI>>({
    name: '',
    type: 'rapid',
    kmMark: 10,
    lat: formData.startPoint.lat,
    lng: formData.startPoint.lng,
    description: '',
    safetyTips: '',
    photo: ''
  });

  // Handle Cover Photo Upload from Device
  const handleCoverPhotoUpload = async (file: File) => {
    try {
      setIsCompressingImage(true);
      const compressedDataUrl = await compressImageFile(file, 1400, 900, 0.85);
      setFormData(prev => ({ ...prev, coverImage: compressedDataUrl }));
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 } });
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки фото.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Handle Gallery Photos Upload from Device
  const handleGalleryPhotosUpload = async (files: FileList) => {
    try {
      setIsCompressingImage(true);
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i], 1200, 800, 0.82);
        newUrls.push(compressed);
      }
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...newUrls]
      }));
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки фотографий галереи.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  // Handle POI Photo Upload for New POI
  const handleNewPoiPhotoUpload = async (file: File) => {
    try {
      setIsCompressingImage(true);
      const compressed = await compressImageFile(file, 800, 600, 0.82);
      setNewPoi(prev => ({ ...prev, photo: compressed }));
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки фото ориентира.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Handle POI Photo Upload for Editing POI
  const handleEditPoiPhotoUpload = async (file: File) => {
    if (!editingPoi) return;
    try {
      setIsCompressingImage(true);
      const compressed = await compressImageFile(file, 800, 600, 0.82);
      setEditingPoi(prev => prev ? ({ ...prev, photo: compressed }) : null);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки фото ориентира.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Handle GPX Upload to populate coordinates & waypoints
  const handleGpxFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const parsed = parseGpxFile(text, file.name);

        setFormData((prev) => ({
          ...prev,
          name: prev.name || parsed.name,
          riverName: prev.riverName || parsed.name,
          lengthKm: parsed.totalDistanceKm,
          coordinates: parsed.coordinates,
          startPoint: parsed.startPoint,
          endPoint: parsed.endPoint,
          elevationGainM: parsed.elevationGainM || prev.elevationGainM,
          pois: parsed.waypoints.length > 0 ? parsed.waypoints : prev.pois,
          elevationProfile: parsed.elevationPoints.map((p) => ({
            distanceKm: p.distKm,
            elevationM: p.elev
          }))
        }));

        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        alert(`GPX трек "${parsed.name}" (${parsed.totalDistanceKm} км) успешно загружен в паспорт реки!`);
      } catch (err: any) {
        alert(err.message || 'Ошибка парсинга GPX');
      }
    };
    reader.readAsText(file);
  };

  // Vessel toggle
  const toggleVessel = (v: VesselType) => {
    setFormData((prev) => {
      const current = prev.recommendedVessels;
      const exists = current.includes(v);
      return {
        ...prev,
        recommendedVessels: exists ? current.filter((x) => x !== v) : [...current, v]
      };
    });
  };

  // Highlights
  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setFormData((prev) => ({ ...prev, highlights: [...prev.highlights, newHighlight.trim()] }));
    setNewHighlight('');
  };
  const removeHighlight = (idx: number) => {
    setFormData((prev) => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== idx) }));
  };

  // Warnings
  const addWarning = () => {
    if (!newWarning.trim()) return;
    setFormData((prev) => ({ ...prev, warnings: [...prev.warnings, newWarning.trim()] }));
    setNewWarning('');
  };
  const removeWarning = (idx: number) => {
    setFormData((prev) => ({ ...prev, warnings: prev.warnings.filter((_, i) => i !== idx) }));
  };

  // Gear
  const addGear = () => {
    if (!newGearItem.trim()) return;
    setFormData((prev) => ({
      ...prev,
      recommendedGear: [...(prev.recommendedGear || []), newGearItem.trim()]
    }));
    setNewGearItem('');
  };
  const removeGear = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      recommendedGear: (prev.recommendedGear || []).filter((_, i) => i !== idx)
    }));
  };

  // POI Management: Add
  const addPoi = () => {
    if (!newPoi.name?.trim()) {
      alert('Пожалуйста, введите название ориентира / препятствия');
      return;
    }
    const fullPoi: RoutePOI = {
      id: `poi-manual-${Date.now()}`,
      name: newPoi.name.trim(),
      type: newPoi.type || 'rapid',
      kmMark: Number(newPoi.kmMark) || 0,
      lat: Number(newPoi.lat) || formData.startPoint.lat,
      lng: Number(newPoi.lng) || formData.startPoint.lng,
      description: newPoi.description || 'Описание ориентира',
      safetyTips: newPoi.safetyTips?.trim() || undefined,
      photo: newPoi.photo || undefined
    };

    setFormData((prev) => ({
      ...prev,
      pois: [...prev.pois, fullPoi].sort((a, b) => (a.kmMark || 0) - (b.kmMark || 0))
    }));

    setNewPoi({
      name: '',
      type: 'rapid',
      kmMark: (newPoi.kmMark || 0) + 5,
      lat: formData.startPoint.lat,
      lng: formData.startPoint.lng,
      description: '',
      safetyTips: '',
      photo: ''
    });
  };

  // POI Management: Save Edited POI
  const saveEditedPoi = () => {
    if (!editingPoi || !editingPoi.name.trim()) return;
    setFormData(prev => ({
      ...prev,
      pois: prev.pois.map(p => p.id === editingPoi.id ? editingPoi : p).sort((a, b) => (a.kmMark || 0) - (b.kmMark || 0))
    }));
    setEditingPoi(null);
  };

  // POI Management: Remove
  const removePoi = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      pois: prev.pois.filter((p) => p.id !== id)
    }));
    if (editingPoi?.id === id) setEditingPoi(null);
  };

  // POI Reorder: Move Up / Down
  const movePoi = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.pois.length) return;
    const items = [...formData.pois];
    const [moved] = items.splice(index, 1);
    items.splice(newIndex, 0, moved);
    setFormData(prev => ({ ...prev, pois: items }));
  };

  // Final Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Пожалуйста, укажите название маршрута');
      setActiveTab('general');
      return;
    }
    if (!formData.riverName.trim()) {
      alert('Пожалуйста, укажите название реки');
      setActiveTab('general');
      return;
    }

    const cleanedRoute: RiverRoute = {
      ...formData,
      lastPassportRevision: new Date().toISOString().split('T')[0],
      gpxFileName: formData.gpxFileName || `${formData.riverName.toLowerCase().replace(/\s+/g, '_')}.gpx`
    };

    onSave(cleanedRoute);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col my-auto text-[#2D332D]">
        
        {/* Hidden inputs for device uploads */}
        <input
          type="file"
          ref={coverFileInputRef}
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) handleCoverPhotoUpload(e.target.files[0]);
          }}
          className="hidden"
        />
        <input
          type="file"
          ref={galleryFileInputRef}
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleGalleryPhotosUpload(e.target.files);
          }}
          className="hidden"
        />
        <input
          type="file"
          ref={newPoiPhotoInputRef}
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) handleNewPoiPhotoUpload(e.target.files[0]);
          }}
          className="hidden"
        />
        <input
          type="file"
          ref={editPoiPhotoInputRef}
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) handleEditPoiPhotoUpload(e.target.files[0]);
          }}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#E5E0D8] bg-[#F9F7F4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F1E7] text-[#2D5A27] flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1F1A]">
                {initialRoute ? 'Редактор паспорта и локации реки' : 'Составление нового паспорта реки'}
              </h2>
              <p className="text-xs text-[#8B7E6D]">
                Полный паспорт реки: редактирование локаций, ориентиров, загрузка фото с устройства и GPX нитка
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-[#E5E0D8] overflow-x-auto bg-[#FCFAF7] shrink-0 text-xs">
          {[
            { id: 'general', label: '1. Основное', icon: FileText },
            { id: 'geography', label: '2. Характер реки', icon: Waves },
            { id: 'lotia', label: `3. Локация и точки (${formData.pois.length})`, icon: MapPin },
            { id: 'logistics', label: '4. Заброска / Выброска', icon: Truck },
            { id: 'safety', label: '5. МЧС и Снаряжение', icon: ShieldAlert },
            { id: 'media', label: '6. Фото с устройства & GPX', icon: Camera }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                    Название паспорта / маршрута *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Сплав по реке Собь: Красный Камень — Харп"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                    Название реки *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Собь, Тромъёган, Аган"
                    value={formData.riverName}
                    onChange={(e) => setFormData({ ...formData, riverName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Регион</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  >
                    <option value="ХМАО">ХМАО — Югра</option>
                    <option value="ЯНАО">ЯНАО — Ямал</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                    Категория сложности (ФСТР)
                  </label>
                  <select
                    value={formData.fstrCategory}
                    onChange={(e) => setFormData({ ...formData, fstrCategory: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  >
                    <option value="н/к">н/к (Некатегорийный)</option>
                    <option value="I к.с.">I категория сложности</option>
                    <option value="II к.с.">II категория сложности</option>
                    <option value="III к.с.">III категория сложности</option>
                    <option value="IV к.с.">IV категория сложности</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                    Бассейн реки
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Бассейн р. Обь"
                    value={formData.riverBasin || ''}
                    onChange={(e) => setFormData({ ...formData, riverBasin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Протяженность (км)</label>
                  <input
                    type="number"
                    value={formData.lengthKm}
                    onChange={(e) => setFormData({ ...formData, lengthKm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Длительность (дней)</label>
                  <input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Скорость течения (км/ч)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.avgFlowSpeedKmh}
                    onChange={(e) => setFormData({ ...formData, avgFlowSpeedKmh: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Перепад высот (м)</label>
                  <input
                    type="number"
                    value={formData.elevationGainM}
                    onChange={(e) => setFormData({ ...formData, elevationGainM: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1.5">
                  Рекомендуемые плавсредства
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'sup', label: '🏄‍♂️ SUP-борд' },
                    { id: 'kayak', label: '🛶 Байдарка / Каяк' },
                    { id: 'catamaran', label: '⛵ Катамаран' },
                    { id: 'raft', label: '🚣 Рафт' },
                    { id: 'motorboat', label: '🚤 Моторная лодка' }
                  ].map((v) => {
                    const isChecked = formData.recommendedVessels.includes(v.id as VesselType);
                    return (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => toggleVessel(v.id as VesselType)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isChecked
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs'
                            : 'bg-[#F9F7F4] text-[#6B665F] border-[#E5E0D8] hover:border-[#2D5A27]'
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Сезонность сплава</label>
                  <input
                    type="text"
                    placeholder="Например: Июнь — Сентябрь"
                    value={formData.seasonMonths}
                    onChange={(e) => setFormData({ ...formData, seasonMonths: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8B7E6D] mb-1">Автор / Составитель паспорта</label>
                  <input
                    type="text"
                    placeholder="Ваше имя или турклуб"
                    value={formData.authorName || ''}
                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GEOGRAPHY & RIVER CHARACTER */}
          {activeTab === 'geography' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                  Краткое резюме / аннотация маршрута (2-3 предложения) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Опишите характер маршрута, для кого он подходит и ключевые впечатления..."
                  value={formData.shortDesc}
                  onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                  Полное гидрографическое описание русла и берегов
                </label>
                <textarea
                  rows={6}
                  placeholder="Детальный очерк: характер дна (галька, песок, ил), крутизна берегов, участки сужений, водный режим в паводок и межень, места рыбалки и стоянок..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              {/* Highlights List */}
              <div className="p-4 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-2">
                <label className="block text-xs font-bold text-[#2D5A27]">
                  ✨ Изюминки и достоинства реки (Highlights)
                </label>
                <div className="space-y-1.5">
                  {formData.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#E5E0D8] text-xs">
                      <span>• {h}</span>
                      <button type="button" onClick={() => removeHighlight(idx)} className="text-[#8B7E6D] hover:text-[#E54B4B]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Добавить преимущество (например: Скальные выходы, трофейный хариус)..."
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                  />
                  <button type="button" onClick={addHighlight} className="px-3 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold">
                    Добавить
                  </button>
                </div>
              </div>

              {/* Warnings List */}
              <div className="p-4 bg-[#FDE8E8]/40 rounded-2xl border border-[#F8B4B4] space-y-2">
                <label className="block text-xs font-bold text-[#E54B4B]">
                  ⚠️ Опасности, ловушки и предостережения (Warnings)
                </label>
                <div className="space-y-1.5">
                  {formData.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#F8B4B4] text-xs">
                      <span>⚠️ {w}</span>
                      <button type="button" onClick={() => removeWarning(idx)} className="text-[#8B7E6D] hover:text-[#E54B4B]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Добавить предупреждение (например: Резкий паводок после дождей в горах)..."
                    value={newWarning}
                    onChange={(e) => setNewWarning(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWarning(); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#E54B4B]"
                  />
                  <button type="button" onClick={addWarning} className="px-3 py-1.5 bg-[#E54B4B] text-white rounded-xl text-xs font-bold">
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOTIA & POIS (FULL LOCATION EDITING & PHOTO UPLOAD) */}
          {activeTab === 'lotia' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#1A1F1A] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2D5A27]" />
                    Редактор точек и ориентиров локации ({formData.pois.length})
                  </h3>
                  <p className="text-xs text-[#8B7E6D]">
                    Пороги, шиверы, завалы, стоянки, избы, стапель и антистапель с фото, описанием и точными координатами
                  </p>
                </div>
              </div>

              {/* Inline Edit Form if a POI is currently selected for editing */}
              {editingPoi && (
                <div className="bg-[#FEFCE8] border-2 border-[#EAB308] rounded-2xl p-4 space-y-3 shadow-md animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#854D0E] flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" />
                      Редактирование локации: {editingPoi.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingPoi(null)}
                      className="p-1 rounded-lg text-[#854D0E] hover:bg-yellow-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Название точки / ориентира *</label>
                      <input
                        type="text"
                        value={editingPoi.name}
                        onChange={(e) => setEditingPoi({ ...editingPoi, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs font-bold outline-none focus:border-[#2D5A27]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Тип локации</label>
                      <select
                        value={editingPoi.type}
                        onChange={(e) => setEditingPoi({ ...editingPoi, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                      >
                        <option value="rapid">🌊 Порог / Шивера</option>
                        <option value="slipway">🛶 Стапель / Антистапель</option>
                        <option value="camp">⛺ Стоянка / Лагерь</option>
                        <option value="cabin">🏠 Изба / Зимовье</option>
                        <option value="portage">🪵 Завал / Обнос</option>
                        <option value="danger">⚠️ Опасность / Камни</option>
                        <option value="hydro_post">💧 Гидропост</option>
                        <option value="indigenous">🏕️ Стойбище КМНС</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Км от старта</label>
                      <input
                        type="number"
                        value={editingPoi.kmMark ?? 0}
                        onChange={(e) => setEditingPoi({ ...editingPoi, kmMark: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Широта (Lat)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editingPoi.lat}
                        onChange={(e) => setEditingPoi({ ...editingPoi, lat: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Долгота (Lng)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editingPoi.lng}
                        onChange={(e) => setEditingPoi({ ...editingPoi, lng: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4A443E] mb-1">Описание прохождения / ориентиры лоции</label>
                    <textarea
                      rows={2}
                      value={editingPoi.description}
                      onChange={(e) => setEditingPoi({ ...editingPoi, description: e.target.value })}
                      placeholder="Линия движения, ключевые камни, где зачалиться для просмотра..."
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#92400E] mb-1">Предостережение / безопасность (Safety Tips)</label>
                    <input
                      type="text"
                      value={editingPoi.safetyTips || ''}
                      onChange={(e) => setEditingPoi({ ...editingPoi, safetyTips: e.target.value })}
                      placeholder="Например: Просмотр с левого берега обязателен!"
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>

                  {/* POI Photo upload from device */}
                  <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {editingPoi.photo ? (
                        <img src={editingPoi.photo} alt="POI" className="w-14 h-14 rounded-lg object-cover border border-[#CDE0CC]" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#F9F7F4] border border-[#E5E0D8] flex items-center justify-center text-[#8B7E6D]">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-[#1A1F1A] block">Фотография локации / препятствия</span>
                        <span className="text-[11px] text-[#8B7E6D]">
                          {editingPoi.photo ? 'Фото прикреплено к точке лоции' : 'Загрузите реальный снимок с берега или воды'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => editPoiPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Загрузить фото с устройства</span>
                      </button>
                      {editingPoi.photo && (
                        <button
                          type="button"
                          onClick={() => setEditingPoi({ ...editingPoi, photo: undefined })}
                          className="p-1.5 text-[#E54B4B] hover:bg-red-50 rounded-lg text-xs"
                          title="Удалить фото"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-yellow-200">
                    <button
                      type="button"
                      onClick={() => setEditingPoi(null)}
                      className="px-4 py-2 bg-white border border-[#E5E0D8] text-xs font-bold rounded-xl hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={saveEditedPoi}
                      className="px-5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Сохранить изменения локации
                    </button>
                  </div>
                </div>
              )}

              {/* POI Table / List */}
              <div className="space-y-2">
                {formData.pois.map((poi, idx) => {
                  let badgeBg = 'bg-[#E8F1E7] text-[#2D5A27]';
                  let icon = '📍';
                  if (poi.type === 'rapid') { badgeBg = 'bg-[#FDE8E8] text-[#E54B4B]'; icon = '🌊'; }
                  if (poi.type === 'danger' || poi.type === 'portage') { badgeBg = 'bg-amber-100 text-amber-800'; icon = '⚠️'; }
                  if (poi.type === 'cabin') { badgeBg = 'bg-orange-100 text-orange-800'; icon = '🏠'; }
                  if (poi.type === 'camp') { badgeBg = 'bg-emerald-100 text-emerald-800'; icon = '⛺'; }
                  if (poi.type === 'hydro_post') { badgeBg = 'bg-blue-100 text-blue-800'; icon = '💧'; }
                  if (poi.type === 'slipway') { badgeBg = 'bg-teal-100 text-teal-800'; icon = '🛶'; }

                  const isCurrentlyEditing = editingPoi?.id === poi.id;

                  return (
                    <div
                      key={poi.id || idx}
                      className={`bg-[#F9F7F4] border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isCurrentlyEditing ? 'border-[#EAB308] bg-yellow-50/40 shadow-xs' : 'border-[#E5E0D8] hover:border-[#D9D1C5]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        {/* Photo Thumbnail if available */}
                        {poi.photo ? (
                          <img
                            src={poi.photo}
                            alt={poi.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#CDE0CC] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-lg shrink-0">
                            {icon}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E5E0D8] text-[11px] font-black text-[#1A1F1A] shrink-0">
                              {poi.kmMark !== undefined ? `${poi.kmMark} км` : `#${idx + 1}`}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase shrink-0 ${badgeBg}`}>
                              {poi.type}
                            </span>
                            <h4 className="text-xs font-bold text-[#1A1F1A]">{poi.name}</h4>
                            {poi.photo && (
                              <span className="text-[10px] bg-emerald-50 text-[#2D5A27] px-1.5 py-0.2 rounded border border-[#CDE0CC] font-bold flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Фото
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B665F] line-clamp-1 mt-0.5">{poi.description}</p>
                          {poi.safetyTips && (
                            <p className="text-[10px] text-[#92400E] font-medium">⚠️ {poi.safetyTips}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* Move Up/Down */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePoi(idx, 'up')}
                          className="p-1.5 rounded-lg text-[#8B7E6D] hover:text-[#2D332D] hover:bg-white disabled:opacity-30"
                          title="Поднять выше"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === formData.pois.length - 1}
                          onClick={() => movePoi(idx, 'down')}
                          className="p-1.5 rounded-lg text-[#8B7E6D] hover:text-[#2D332D] hover:bg-white disabled:opacity-30"
                          title="Опустить ниже"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => setEditingPoi({ ...poi })}
                          className="px-2.5 py-1.5 bg-white border border-[#CDE0CC] text-[#2D5A27] hover:bg-[#E8F1E7] rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                          title="Редактировать точку"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Изменить</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removePoi(poi.id)}
                          className="p-1.5 text-[#8B7E6D] hover:text-[#E54B4B] hover:bg-white rounded-lg transition-colors"
                          title="Удалить локацию"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New POI Card with Device Photo Upload */}
              <div className="bg-[#F9F7F4] border border-[#E5E0D8] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-[#2D5A27] flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Добавить новый ориентир / препятствие в лоцию реки
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Название ориентира *</label>
                    <input
                      type="text"
                      placeholder="Например: Порог «Труба», Устье ручья, Стоянка в кедрах"
                      value={newPoi.name}
                      onChange={(e) => setNewPoi({ ...newPoi, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Тип точки</label>
                    <select
                      value={newPoi.type}
                      onChange={(e) => setNewPoi({ ...newPoi, type: e.target.value as RoutePOI['type'] })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    >
                      <option value="rapid">🌊 Порог / Шивера</option>
                      <option value="slipway">🛶 Стапель / Спуск</option>
                      <option value="camp">⛺ Стоянка / Лагерь</option>
                      <option value="cabin">🏠 Изба / Зимовье</option>
                      <option value="portage">🪵 Завал / Обнос</option>
                      <option value="danger">⚠️ Опасность / Камни</option>
                      <option value="hydro_post">💧 Гидропост</option>
                      <option value="indigenous">🏕️ Стойбище КМНС</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Км от старта</label>
                    <input
                      type="number"
                      value={newPoi.kmMark || 0}
                      onChange={(e) => setNewPoi({ ...newPoi, kmMark: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Широта (Lat)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newPoi.lat}
                      onChange={(e) => setNewPoi({ ...newPoi, lat: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Долгота (Lng)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newPoi.lng}
                      onChange={(e) => setNewPoi({ ...newPoi, lng: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Описание прохождения / лоция</label>
                    <input
                      type="text"
                      placeholder="Линия движения, ориентиры..."
                      value={newPoi.description}
                      onChange={(e) => setNewPoi({ ...newPoi, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B7E6D] mb-1">Совет по безопасности</label>
                    <input
                      type="text"
                      placeholder="Например: Обнос по правому берегу"
                      value={newPoi.safetyTips || ''}
                      onChange={(e) => setNewPoi({ ...newPoi, safetyTips: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                {/* Attach photo to new POI from device */}
                <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {newPoi.photo ? (
                      <img src={newPoi.photo} alt="POI Preview" className="w-12 h-12 rounded-lg object-cover border border-[#CDE0CC]" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#F9F7F4] border border-[#E5E0D8] flex items-center justify-center text-[#8B7E6D]">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-[#1A1F1A] block">Фотография ориентира с устройства</span>
                      <span className="text-[11px] text-[#8B7E6D]">
                        {newPoi.photo ? 'Фото прикреплено' : 'Снимок порога, стоянки или берега'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => newPoiPhotoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#F9F7F4] border border-[#E5E0D8] hover:border-[#2D5A27] text-[#2D332D] rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Выбрать фото</span>
                    </button>
                    {newPoi.photo && (
                      <button
                        type="button"
                        onClick={() => setNewPoi({ ...newPoi, photo: '' })}
                        className="p-1.5 text-[#E54B4B] hover:bg-red-50 rounded-lg text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addPoi}
                  className="w-full py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Добавить локацию в лоцию
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOGISTICS (ACCESS IN / ACCESS OUT) */}
          {activeTab === 'logistics' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                  Заброска к точке старта (Access In)
                </label>
                <textarea
                  rows={3}
                  placeholder="Опишите, как добраться до стапеля: поезд (станция), автодорога, аренда вездехода ТРЭКОЛ, лодочная переправа..."
                  value={formData.logisticsTransfer?.accessIn || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logisticsTransfer: {
                        ...(formData.logisticsTransfer || { accessIn: '', accessOut: '' }),
                        accessIn: e.target.value
                      }
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                  Выброска с точки финиша (Access Out)
                </label>
                <textarea
                  rows={3}
                  placeholder="Опишите отъезд с финиша: регулярность пассажирского транспорта, причал теплохода 'Метеор', связь с диспетчером..."
                  value={formData.logisticsTransfer?.accessOut || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logisticsTransfer: {
                        ...(formData.logisticsTransfer || { accessIn: '', accessOut: '' }),
                        accessOut: e.target.value
                      }
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8B7E6D] mb-1">
                  Контакты местных перевозчиков и забросчиков
                </label>
                <input
                  type="text"
                  placeholder="Телефоны вездеходчиков, катеров, таксистов поселка..."
                  value={formData.logisticsTransfer?.transportContacts || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logisticsTransfer: {
                        ...(formData.logisticsTransfer || { accessIn: '', accessOut: '' }),
                        transportContacts: e.target.value
                      }
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 5: SAFETY, MCHS & GEAR */}
          {activeTab === 'safety' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-[#F9F7F4] rounded-2xl border border-[#E5E0D8] cursor-pointer hover:border-[#2D5A27]">
                  <input
                    type="checkbox"
                    checked={formData.mchsRegistrationRequired}
                    onChange={(e) => setFormData({ ...formData, mchsRegistrationRequired: e.target.checked })}
                    className="w-4 h-4 text-[#2D5A27] rounded-sm focus:ring-[#2D5A27]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1A] block">Обязательная регистрация в МЧС</span>
                    <span className="text-[11px] text-[#8B7E6D]">Требуется подача уведомления за 10 дней</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-[#F9F7F4] rounded-2xl border border-[#E5E0D8] cursor-pointer hover:border-[#2D5A27]">
                  <input
                    type="checkbox"
                    checked={formData.kmnsPermitNeeded}
                    onChange={(e) => setFormData({ ...formData, kmnsPermitNeeded: e.target.checked })}
                    className="w-4 h-4 text-[#2D5A27] rounded-sm focus:ring-[#2D5A27]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1A] block">Разрешение КМНС / Заповедника</span>
                    <span className="text-[11px] text-[#8B7E6D]">Прохождение по родовым угодьям или ООПТ</span>
                  </div>
                </label>
              </div>

              {/* Recommended Gear Checklist */}
              <div className="p-4 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-2">
                <label className="block text-xs font-bold text-[#2D5A27]">
                  🎒 Рекомендуемое снаряжение для паспорта реки
                </label>
                <div className="space-y-1.5">
                  {(formData.recommendedGear || []).map((gear, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#E5E0D8] text-xs">
                      <span>• {gear}</span>
                      <button type="button" onClick={() => removeGear(idx)} className="text-[#8B7E6D] hover:text-[#E54B4B]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Добавить элемент снаряжения (например: Спутниковый трекер Иридиум)..."
                    value={newGearItem}
                    onChange={(e) => setNewGearItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGear(); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#E5E0D8] rounded-xl text-xs outline-none focus:border-[#2D5A27]"
                  />
                  <button type="button" onClick={addGear} className="px-3 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold">
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MEDIA (DEVICE PHOTO UPLOADS FOR COVER & GALLERY) */}
          {activeTab === 'media' && (
            <div className="space-y-5 animate-fade-in">
              {/* GPX Track Import for coordinates */}
              <div className="p-4 bg-[#E8F1E7]/50 rounded-2xl border border-[#CDE0CC] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-[#2D5A27] flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4" />
                      Автозаполнение координат и лоции из GPX файла
                    </h4>
                    <p className="text-[11px] text-[#6B665F]">
                      Загрузите реальный `.gpx` трек, чтобы проложить нитку русла на интерактивной карте ({formData.coordinates.length} точек)
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={gpxFileInputRef}
                    accept=".gpx,.kml,.xml"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleGpxFile(e.target.files[0]);
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => gpxFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Выбрать GPX файл</span>
                  </button>
                </div>
              </div>

              {/* Cover Image Upload from Device */}
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#E5E0D8] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black text-[#1A1F1A]">
                      Главная обложка паспорта реки
                    </label>
                    <p className="text-[11px] text-[#8B7E6D]">
                      Загрузите фото с телефона или компьютера либо выберите из пресетов
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Загрузить фото с устройства</span>
                  </button>
                </div>

                {/* Current Cover Preview */}
                {formData.coverImage && (
                  <div className="relative h-44 sm:h-56 rounded-2xl overflow-hidden border border-[#E5E0D8] shadow-xs">
                    <img src={formData.coverImage} alt="Обложка" className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] text-white font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Текущая обложка
                    </div>
                  </div>
                )}

                {/* Preset Covers Carousel */}
                <div>
                  <span className="text-[11px] font-bold text-[#8B7E6D] block mb-2">Или готовые фотографии рек:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESET_COVERS.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                        className={`relative h-18 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          formData.coverImage === preset.url
                            ? 'border-[#2D5A27] ring-2 ring-[#2D5A27]/30 scale-[1.02]'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                          <span className="text-[9px] text-white font-bold truncate">{preset.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* River Photo Gallery Upload from Device */}
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#E5E0D8] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black text-[#1A1F1A] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#2D5A27]" />
                      Фотогалерея реки и экспедиций ({(formData.photos || []).length} фото)
                    </label>
                    <p className="text-[11px] text-[#8B7E6D]">
                      Загружайте фотографии красивых стоянок, порогов, природы и экипажей
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-[#CDE0CC] text-[#2D5A27] hover:bg-[#E8F1E7] rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>+ Добавить фото в галерею</span>
                  </button>
                </div>

                {/* Gallery Thumbnails Grid */}
                {(formData.photos || []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {(formData.photos || []).map((photoUrl, pIdx) => (
                      <div key={pIdx} className="relative group rounded-xl overflow-hidden h-28 border border-[#E5E0D8]">
                        <img src={photoUrl} alt={`Фото ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryPhoto(pIdx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-[#E54B4B] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Удалить из галереи"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center border-2 border-dashed border-[#E5E0D8] rounded-xl">
                    <ImageIcon className="w-8 h-8 text-[#8B7E6D] mx-auto mb-1.5 opacity-60" />
                    <p className="text-xs font-bold text-[#6B665F]">В галерее пока нет дополнительных фото</p>
                    <p className="text-[11px] text-[#8B7E6D]">Нажмите кнопку выше, чтобы загрузить снимки с устройства</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-[#E5E0D8] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E0D8] text-xs font-bold text-[#6B665F] hover:bg-[#F9F7F4]"
            >
              Отмена
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить паспорт реки и лоцию</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
