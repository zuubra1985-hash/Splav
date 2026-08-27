import React from 'react';
import { 
  Compass, 
  Users, 
  CheckSquare, 
  BookOpen, 
  User, 
  LogIn, 
  Shield,
  Waves
} from 'lucide-react';
import { Region, AppUser } from '../types';

export type MainNavigationTab = 
  | 'routes' 
  | 'companions' 
  | 'preparation' 
  | 'notes'
  | 'mytrip' 
  | 'cabinet' 
  | 'knowledge'
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
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E0D8] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & Brand */}
          <div 
            id="brand-logo-btn"
            className="flex items-center space-x-2.5 cursor-pointer shrink-0" 
            onClick={() => setActiveTab('routes')}
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2D5A27] text-white shadow-sm shadow-[#2D5A27]/20 shrink-0">
              <Waves className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#1A1F1A]">
                  SPLAV<span className="text-[#2D5A27]">86</span>
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                  Югра • Ямал
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (Strictly 5 Core Sections) */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              id="nav-tab-routes"
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'routes'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#2D5A27]" />
              <span>Маршруты</span>
            </button>

            <button
              id="nav-tab-trips"
              onClick={() => setActiveTab('companions')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'companions'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <Users className="w-4 h-4 text-[#2D5A27]" />
              <span>Сплавы</span>
            </button>

            <button
              id="nav-tab-preparation"
              onClick={() => setActiveTab('preparation')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'preparation'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-[#2D5A27]" />
              <span>Подготовка</span>
            </button>

            <button
              id="nav-tab-notes"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'notes'
                  ? 'bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]'
                  : 'text-[#6B665F] hover:text-[#2D5A27] hover:bg-[#F9F7F4]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#2D5A27]" />
              <span>Путевые заметки</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Admin Panel Button (Only visible if admin / superadmin) */}
            {isAdmin && (
              <button
                id="nav-tab-admin-btn"
                onClick={() => setActiveTab('admin')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'admin'
                    ? 'bg-[#8A3B14] text-white shadow-xs'
                    : 'bg-[#FDF3EB] text-[#8A3B14] border border-[#F3DAC9] hover:bg-[#FBE8DB]'
                }`}
                title="Панель администратора"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Админка</span>
              </button>
            )}

            {/* Profile / Auth Button */}
            {!currentUser ? (
              <button
                id="nav-auth-login-btn"
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти</span>
              </button>
            ) : (
              <button
                id="nav-profile-btn"
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
                    className="w-5 h-5 rounded-lg object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-lg bg-[#2D5A27] text-white flex items-center justify-center text-[10px] font-bold">
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

      {/* MOBILE BOTTOM NAVIGATION (Section 23: Exactly 5 items, touch-friendly) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-md border-t border-[#E5E0D8] px-1 py-1 flex items-center justify-around shadow-lg">
        <button
          id="mobile-nav-routes"
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[56px] ${
            activeTab === 'routes' ? 'text-[#2D5A27] font-black' : 'text-[#6B665F]'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'routes' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 leading-none">Маршруты</span>
        </button>

        <button
          id="mobile-nav-trips"
          onClick={() => setActiveTab('companions')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[56px] ${
            activeTab === 'companions' ? 'text-[#2D5A27] font-black' : 'text-[#6B665F]'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'companions' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 leading-none">Сплавы</span>
        </button>

        <button
          id="mobile-nav-preparation"
          onClick={() => setActiveTab('preparation')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[56px] ${
            activeTab === 'preparation' ? 'text-[#2D5A27] font-black' : 'text-[#6B665F]'
          }`}
        >
          <CheckSquare className={`w-5 h-5 ${activeTab === 'preparation' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 leading-none">Подготовка</span>
        </button>

        <button
          id="mobile-nav-notes"
          onClick={() => setActiveTab('notes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[56px] ${
            activeTab === 'notes' ? 'text-[#2D5A27] font-black' : 'text-[#6B665F]'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeTab === 'notes' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 leading-none">Заметки</span>
        </button>

        <button
          id="mobile-nav-profile"
          onClick={() => currentUser ? setActiveTab('cabinet') : onOpenAuth()}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[56px] ${
            activeTab === 'cabinet' || activeTab === 'admin' ? 'text-[#2D5A27] font-black' : 'text-[#6B665F]'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'cabinet' || activeTab === 'admin' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 leading-none">{currentUser ? 'Профиль' : 'Войти'}</span>
        </button>
      </div>

    </header>
  );
};
