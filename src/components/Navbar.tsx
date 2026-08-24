import React from 'react';
import { Compass, Waves, CloudRain, Users, BookOpen, User, LogIn, HelpCircle, BookmarkCheck, Edit3, Send } from 'lucide-react';
import { Region, AppUser } from '../types';
import { isTelegramWebApp } from '../utils/telegramWebApp';

interface NavbarProps {
  activeTab: 'routes' | 'companions' | 'mchs_safety' | 'articles' | 'logbook' | 'cabinet';
  setActiveTab: (tab: 'routes' | 'companions' | 'mchs_safety' | 'articles' | 'logbook' | 'cabinet') => void;
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
              <HelpCircle className="w-4 h-4 text-[#2D5A27]" />
              <span>FAQ</span>
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
              onClick={() => setActiveTab('logbook')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'logbook'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] shadow-2xs'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Edit3 className="w-4 h-4 text-[#2D5A27]" />
              <span>Путевые заметки</span>
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

            {isTelegramWebApp() && (
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 text-[#0088cc] border border-sky-200"
                title="Приложение запущено внутри Telegram Mini App"
              >
                <Send className="w-3 h-3 text-[#0088cc]" />
                <span>Telegram</span>
              </div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-md border-t border-[#E5E0D8] px-1 py-1 flex items-center justify-around shadow-2xl pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'routes'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="Каталог маршрутов и карта"
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold">Маршруты</span>
        </button>

        <button
          onClick={() => setActiveTab('companions')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'companions'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="Поиск попутчиков и организация походов"
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold">Попутчики</span>
        </button>

        <button
          onClick={() => setActiveTab('mchs_safety')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'mchs_safety'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="FAQ: Безопасность, связь, МЧС и ответы на вопросы"
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold">FAQ</span>
        </button>

        <button
          onClick={() => setActiveTab('articles')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'articles'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="Статьи, лоции и отчеты об экспедициях"
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold">Статьи</span>
        </button>

        <button
          onClick={() => setActiveTab('logbook')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'logbook'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="Путевые заметки, чек-лист и бортовой журнал"
        >
          <Edit3 className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold">Заметки</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setActiveTab('cabinet');
          }}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'cabinet'
              ? 'text-[#2D5A27] font-black bg-[#E8F1E7]'
              : 'text-[#6B665F] font-medium'
          }`}
          title="Личный кабинет"
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
          <span className="text-[9px] font-bold truncate max-w-[46px]">
            {currentUser ? currentUser.name.split(' ')[0] : 'Войти'}
          </span>
        </button>

      </nav>

    </header>
  );
};
