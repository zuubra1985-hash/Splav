import React from 'react';
import { 
  Compass, 
  Waves, 
  Users, 
  BookOpen, 
  User, 
  LogIn, 
  ShieldCheck, 
  Heart, 
  CheckSquare, 
  Map as MapIcon, 
  Send,
  Navigation,
  Shield
} from 'lucide-react';
import { Region, AppUser } from '../types';
import { isTelegramWebApp } from '../utils/telegramWebApp';

export type MainNavigationTab = 
  | 'routes' 
  | 'companions' 
  | 'preparation' 
  | 'knowledge' 
  | 'mytrip' 
  | 'cabinet' 
  | 'admin';

interface NavbarProps {
  activeTab: MainNavigationTab;
  setActiveTab: (tab: MainNavigationTab) => void;
  selectedRegion?: Region;
  setSelectedRegion?: (region: Region) => void;
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  isOnline?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  isOnline = true
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const favoritesCount = currentUser?.favoriteRouteIds?.length || 0;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E0D8] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer shrink-0" 
            onClick={() => setActiveTab('routes')}
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-[#2D5A27] text-white shadow-md shadow-[#2D5A27]/20 shrink-0">
              <Waves className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-[#1A1F1A]">
                  SPLAV<span className="text-[#2D5A27]">86</span>
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                  Югра • Ямал
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#6B665F] font-medium hidden lg:block truncate max-w-md">
                Исследуем Север там, куда не ведут дороги.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (P0: 5 core sections + Мой поход) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'routes'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#2D5A27]" />
              <span>Карта и Маршруты</span>
            </button>

            <button
              onClick={() => setActiveTab('companions')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'companions'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Users className="w-4 h-4 text-[#2D5A27]" />
              <span>Попутчики</span>
            </button>

            <button
              onClick={() => setActiveTab('preparation')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'preparation'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-[#2D5A27]" />
              <span>Подготовка</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#2D5A27]" />
              <span>База знаний</span>
            </button>

            <button
              onClick={() => setActiveTab('mytrip')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'mytrip'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
              <span>Мой поход</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Live Online Badge */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                isOnline 
                  ? 'bg-[#E8F1E7]/80 text-[#2D5A27] border-[#CDE0CC]' 
                  : 'bg-[#FDE8E8] text-[#E54B4B] border-[#F8B4B4]'
              }`}
              title={isOnline ? 'Подключение к сети активно' : 'Нет подключения к интернету'}
            >
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
              </span>
              <span className="truncate">{isOnline ? 'Онлайн' : 'Офлайн'}</span>
            </div>

            {/* Telegram App badge */}
            {isTelegramWebApp() && (
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 text-[#0088cc] border border-sky-200"
                title="Приложение запущено внутри Telegram Mini App"
              >
                <Send className="w-3 h-3 text-[#0088cc]" />
                <span>Telegram</span>
              </div>
            )}

            {/* Admin Panel Button (Only visible if admin / superadmin) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'admin'
                    ? 'bg-[#8A3B14] text-white shadow-xs'
                    : 'bg-[#FDF3EB] text-[#8A3B14] border border-[#F3DAC9] hover:bg-[#FBE8DB]'
                }`}
                title="Панель администратора"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Администрирование</span>
              </button>
            )}

            {/* Profile / Auth Button */}
            {!currentUser ? (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('cabinet')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  activeTab === 'cabinet'
                    ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs'
                    : 'bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#1A1F1A] border-[#E5E0D8]'
                }`}
                title={currentUser.name}
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-lg object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-[#2D5A27] text-white flex items-center justify-center text-[11px] font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold max-w-[100px] truncate hidden sm:inline">
                  {currentUser.name}
                </span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Requirement 21) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E0D8] px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeTab === 'routes' ? 'text-[#2D5A27] font-bold' : 'text-[#6B665F]'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Маршруты</span>
        </button>

        <button
          onClick={() => setActiveTab('companions')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeTab === 'companions' ? 'text-[#2D5A27] font-bold' : 'text-[#6B665F]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Попутчики</span>
        </button>

        <button
          onClick={() => setActiveTab('mytrip')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeTab === 'mytrip' ? 'text-[#2D5A27] font-bold' : 'text-[#6B665F]'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px]">Мой поход</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeTab === 'knowledge' ? 'text-[#2D5A27] font-bold' : 'text-[#6B665F]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">База знаний</span>
        </button>

        <button
          onClick={() => currentUser ? setActiveTab('cabinet') : onOpenAuth()}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeTab === 'cabinet' || activeTab === 'admin' ? 'text-[#2D5A27] font-bold' : 'text-[#6B665F]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{currentUser ? 'Профиль' : 'Войти'}</span>
        </button>
      </div>

    </header>
  );
};
