import React from 'react';
import { Compass, Waves, CloudRain, Users, BookOpen, Calculator, User, LogIn, RadioTower } from 'lucide-react';
import { Region, AppUser } from '../types';

interface NavbarProps {
  activeTab: 'routes' | 'weather_hydro' | 'companions' | 'mchs_safety' | 'articles' | 'calculator' | 'cabinet';
  setActiveTab: (tab: 'routes' | 'weather_hydro' | 'companions' | 'mchs_safety' | 'articles' | 'calculator' | 'cabinet') => void;
  selectedRegion?: Region;
  setSelectedRegion?: (region: Region) => void;
  currentUser: AppUser | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E0D8] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('routes')}>
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

          {/* Desktop Navigation Links */}
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
              <span>Карта и реки</span>
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
              onClick={() => setActiveTab('mchs_safety')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'mchs_safety'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <RadioTower className="w-4 h-4 text-[#2D5A27]" />
              <span>Связь и МЧС</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'articles'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#2D5A27]" />
              <span>Статьи и отчеты</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'calculator'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Calculator className="w-4 h-4 text-[#2D5A27]" />
              <span>Расчет</span>
            </button>

            <button
              onClick={() => setActiveTab('weather_hydro')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'weather_hydro'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <CloudRain className="w-4 h-4 text-[#2D5A27]" />
              <span>Гидрология</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            
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
                    className="w-6 h-6 rounded-full object-cover border border-white/40"
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeTab === 'cabinet' ? 'bg-white text-[#2D5A27]' : 'bg-[#2D5A27] text-white'
                  }`}>
                    {currentUser.name.slice(0, 1)}
                  </div>
                )}
                <span className="text-xs font-bold max-w-[110px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E0D8] px-1 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'routes'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Карты</span>
        </button>

        <button
          onClick={() => setActiveTab('companions')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'companions'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Попутчики</span>
        </button>

        <button
          onClick={() => setActiveTab('mchs_safety')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'mchs_safety'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          <RadioTower className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">Связь/МЧС</span>
        </button>

        <button
          onClick={() => setActiveTab('articles')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'articles'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Статьи</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'calculator'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          <Calculator className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Расчет</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setActiveTab('cabinet');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'cabinet'
              ? 'text-[#2D5A27] font-extrabold bg-[#E8F1E7]/70'
              : 'text-[#6B665F] font-medium'
          }`}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-4 h-4 rounded-full object-cover mb-0.5 border border-[#2D5A27]"
            />
          ) : (
            <User className="w-4 h-4 mb-0.5" />
          )}
          <span className="text-[10px]">
            {currentUser ? currentUser.name.split(' ')[0] : 'Войти'}
          </span>
        </button>

      </nav>

    </header>
  );
};
