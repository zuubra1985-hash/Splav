import React, { useState, useRef } from 'react';
import { 
  AppUser, 
  RiverRoute, 
  CompanionTrip, 
  TripApplication, 
  VesselType 
} from '../types';
import { 
  User, 
  LogOut, 
  Edit3, 
  Save, 
  Compass, 
  Heart, 
  Users, 
  Download, 
  Upload, 
  MapPin, 
  CheckCircle2, 
  ChevronRight, 
  Camera, 
  Trash2, 
  FileText, 
  Radio, 
  ShieldCheck, 
  Settings,
  Plus
} from 'lucide-react';
import { parseGpxFile, generateGpxString } from '../utils/gpxParser';
import { compressAvatarFile } from '../utils/imageCompressor';
import { MyTripsStore } from '../services/myTripsStore';

interface UserCabinetModuleProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onUpdateCurrentUser: (user: AppUser) => void;
  routes: RiverRoute[];
  trips: CompanionTrip[];
  onOpenMyTrip?: () => void;
  onOpenRouteDetails?: (route: RiverRoute) => void;
  onToggleFavorite?: (routeId: string) => void;
  onAddCustomRoute?: (route: RiverRoute) => void;
  initialTab?: 'profile' | 'trips' | 'routes' | 'applications' | 'favorites' | 'gpx' | 'settings';
}

export const UserCabinetModule: React.FC<UserCabinetModuleProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onUpdateCurrentUser,
  routes,
  trips,
  onOpenMyTrip,
  onOpenRouteDetails,
  onToggleFavorite,
  onAddCustomRoute,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'trips' | 'routes' | 'applications' | 'favorites' | 'gpx' | 'settings'>(initialTab);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [telegram, setTelegram] = useState<string>(currentUser?.telegram || '');
  const [experience, setExperience] = useState<string>(currentUser?.experience || 'Любитель (1-3 сезона)');
  const [radioCallsign, setRadioCallsign] = useState<string>(currentUser?.radioCallsign || '');
  const [ownedVessels, setOwnedVessels] = useState<VesselType[]>(currentUser?.ownedVessels || ['kayak']);
  const [emergencyContactName, setEmergencyContactName] = useState<string>(currentUser?.emergencyContact?.name || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(currentUser?.emergencyContact?.phone || '');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#E8F1E7] text-[#2D5A27] mx-auto flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#1A1F1A]">Личный кабинет туриста</h2>
        <p className="text-xs text-[#6B665F]">
          Войдите или зарегистрируйтесь, чтобы сохранять маршруты, вести подготовку сплавов и находить попутчиков.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  // Favorite routes
  const favoriteRoutes = routes.filter((r) => currentUser.favoriteRouteIds?.includes(r.id));
  
  // Authored routes
  const authoredRoutes = routes.filter((r) => r.authorId === currentUser.id);

  // User's Trips from CompanionTrip & MyTrips
  const myCompanionTrips = trips.filter((t) => t.organizer.userId === currentUser.id || t.participants.some(p => p.userId === currentUser.id));
  const myPlannerTrips = MyTripsStore.getMyTrips(currentUser.id);

  // User's Trip applications
  const myApplications = trips.flatMap(t => 
    (t.applications || []).filter(a => a.userId === currentUser.id).map(a => ({ ...a, tripTitle: t.title, riverName: t.riverName }))
  );

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarFile(file);
      const updated = { ...currentUser, avatar: compressed };
      onUpdateCurrentUser(updated);
    } catch (err) {
      console.warn('Avatar compression failed', err);
    }
  };

  // Save profile edits
  const handleSaveProfile = () => {
    const updated: AppUser = {
      ...currentUser,
      name,
      phone,
      telegram,
      experience,
      radioCallsign,
      ownedVessels,
      emergencyContact: emergencyContactName ? {
        name: emergencyContactName,
        phone: emergencyContactPhone
      } : undefined
    };
    onUpdateCurrentUser(updated);
    setIsEditingProfile(false);
  };

  // Handle GPX track import
  const handleGpxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddCustomRoute) return;
    try {
      const text = await file.text();
      const parsed = parseGpxFile(text, file.name);
      const newRoute: RiverRoute = {
        id: `user-route-${Date.now()}`,
        name: parsed.name || file.name.replace('.gpx', ''),
        riverName: parsed.name || 'Пользовательский трек',
        region: 'ХМАО',
        fstrCategory: 'I к.с.',
        intlClass: 'Class I',
        lengthKm: Math.round(parsed.totalDistanceKm || 10),
        durationDays: Math.max(1, Math.round((parsed.totalDistanceKm || 10) / 25)),
        recommendedVessels: ['kayak'],
        startPoint: {
          name: 'Старт трека',
          lat: parsed.coordinates[0]?.[0] || 60.0,
          lng: parsed.coordinates[0]?.[1] || 70.0
        },
        endPoint: {
          name: 'Финиш трека',
          lat: parsed.coordinates[parsed.coordinates.length - 1]?.[0] || 60.0,
          lng: parsed.coordinates[parsed.coordinates.length - 1]?.[1] || 70.0
        },
        coordinates: parsed.coordinates,
        elevationGainM: 0,
        avgFlowSpeedKmh: 4,
        seasonMonths: 'июнь–август',
        description: 'Импортированный пользователем GPX трек',
        shortDesc: 'Пользовательский маршрут',
        highlights: ['Пользовательский трек'],
        warnings: ['Перед выходом сверьте гидрологическую обстановку'],
        mchsRegistrationRequired: true,
        kmnsPermitNeeded: false,
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        pois: parsed.waypoints || [],
        elevationProfile: [],
        gpxFileName: file.name,
        authorId: currentUser.id,
        authorName: currentUser.name,
        isPersonal: true
      };
      onAddCustomRoute(newRoute);
      alert('GPX трек успешно импортирован в ваши маршруты!');
    } catch (err) {
      alert('Ошибка разбора GPX файла. Проверьте формат XML.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 text-[#2D332D]">
      
      {/* Profile Card Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#2D5A27]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center text-2xl font-black">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#1A1F1A]">{currentUser.name}</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                  {currentUser.role === 'admin' ? 'Администратор' : 'Водный турист'}
                </span>
              </div>
              <p className="text-xs text-[#6B665F] mt-0.5">{currentUser.email}</p>
              {currentUser.radioCallsign && (
                <div className="text-[11px] font-mono text-[#2D5A27] font-bold mt-1">
                  Позывной: {currentUser.radioCallsign}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border border-[#E5E0D8] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingProfile ? 'Отмена' : 'Редактировать'}</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-[#E54B4B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Section Tabs - Column on mobile, flex on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2 border-t border-[#EEEBE6] pt-3">
          {[
            { id: 'profile', label: 'Мой профиль', icon: User },
            { id: 'trips', label: 'Мои сплавы', count: myPlannerTrips.length + myCompanionTrips.length, icon: Compass },
            { id: 'routes', label: 'Мои маршруты', count: authoredRoutes.length, icon: MapPin },
            { id: 'applications', label: 'Заявки', count: myApplications.length, icon: Users },
            { id: 'favorites', label: 'Избранное', count: favoriteRoutes.length, icon: Heart },
            { id: 'gpx', label: 'Мои GPX треки', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full lg:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-start gap-2.5 transition-all ${
                  isActive
                    ? 'bg-[#2D5A27] text-white shadow-2xs'
                    : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E5E0D8] text-[#2D332D]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. PROFILE DETAILS / EDITING */}
      {activeTab === 'profile' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-5">
          {isEditingProfile ? (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-[#1A1F1A] uppercase tracking-wider">Редактирование профиля</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Имя и фамилия</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Telegram (@username)</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A443E] block mb-1">Радиопозывной (LPD / VHF)</label>
                  <input
                    type="text"
                    value={radioCallsign}
                    onChange={(e) => setRadioCallsign(e.target.value)}
                    placeholder="Север-1, Югра-22..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#EEEBE6]">
                <h3 className="text-xs font-bold text-[#2D5A27] uppercase mb-2">Экстренное контактное лицо</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="ФИО дежурного на Большой земле"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="Телефон дежурного (+7...)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F9F7F4] border border-[#E5E0D8] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Опыт сплавов</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1">{currentUser.experience || 'Любитель (1-3 сезона)'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Плавсредства</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1">
                    {currentUser.ownedVessels && currentUser.ownedVessels.length > 0 ? currentUser.ownedVessels.join(', ') : 'Байдарка, SUP'}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6]">
                  <div className="text-[10px] uppercase font-bold text-[#8B7E6D]">Экстренный контакт</div>
                  <div className="text-xs font-bold text-[#1A1F1A] mt-1 truncate">
                    {currentUser.emergencyContact?.name || 'Не указан'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MY TRIPS */}
      {activeTab === 'trips' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#1A1F1A]">Мои активные и запланированные сплавы</h2>
            {onOpenMyTrip && (
              <button
                onClick={onOpenMyTrip}
                className="px-3.5 py-1.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Открыть «Мой сплав»</span>
              </button>
            )}
          </div>

          {myPlannerTrips.length === 0 && myCompanionTrips.length === 0 ? (
            <p className="text-xs text-[#6B665F]">У вас пока нет активных сплавов. Выберите маршрут в каталоге и начните подготовку.</p>
          ) : (
            <div className="space-y-3">
              {myPlannerTrips.map((pt) => (
                <div
                  key={pt.id}
                  onClick={onOpenMyTrip}
                  className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A]">{pt.routeName}</div>
                    <div className="text-[11px] text-[#6B665F]">{pt.region} • {pt.durationDays} дн. • {pt.startDate}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. FAVORITES */}
      {activeTab === 'favorites' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <h2 className="text-base font-black text-[#1A1F1A]">Избранные маршруты ({favoriteRoutes.length})</h2>
          {favoriteRoutes.length === 0 ? (
            <p className="text-xs text-[#6B665F]">В избранном пока нет маршрутов. Нажмите на сердечко в паспорте реки, чтобы добавить.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {favoriteRoutes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onOpenRouteDetails && onOpenRouteDetails(r)}
                  className="p-3.5 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] hover:border-[#2D5A27] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#1A1F1A]">{r.name}</div>
                    <div className="text-[11px] text-[#6B665F]">{r.region} • {r.lengthKm} км • {r.fstrCategory}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#2D5A27]" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. GPX TRACKS IMPORT / EXPORT */}
      {activeTab === 'gpx' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E0D8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1A1F1A]">Мои GPX треки и навигация</h2>
              <p className="text-xs text-[#6B665F]">Импортируйте личные треки из навигаторов Garmin или приложений OsmAnd</p>
            </div>
            <button
              onClick={() => gpxInputRef.current?.click()}
              className="px-3.5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Загрузить GPX</span>
            </button>
            <input
              type="file"
              ref={gpxInputRef}
              onChange={handleGpxImport}
              accept=".gpx"
              className="hidden"
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] text-xs text-[#4A443E] space-y-1">
            <strong>Совет по навигации:</strong>
            <p>Все загруженные треки сохраняются в защищенном профиле и доступны для экспорта на любые устройства без подключения к сети.</p>
          </div>
        </div>
      )}

    </div>
  );
};
