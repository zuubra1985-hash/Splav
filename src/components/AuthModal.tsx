import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  X, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Send, 
  Globe, 
  Laptop, 
  Smartphone,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { initTelegramWebApp, TelegramTourist, isTelegramWebApp } from '../utils/telegramWebApp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  registeredUsers: AppUser[];
  onRegisterUser: (newUser: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  registeredUsers,
  onRegisterUser
}) => {
  const [authMode, setAuthMode] = useState<'telegram' | 'login' | 'register'>('login');
  const [tgTourist, setTgTourist] = useState<TelegramTourist | null>(null);
  const [isInTelegram, setIsInTelegram] = useState<boolean>(false);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState<string>(''); // Email or @telegram / ID
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register fields
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Сургут');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regExperience, setRegExperience] = useState<string>('Любитель водных походов');
  const [regTelegram, setRegTelegram] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check Telegram runtime on open
  useEffect(() => {
    if (isOpen) {
      const tourist = initTelegramWebApp();
      const inTg = isTelegramWebApp() || Boolean(tourist);
      setTgTourist(tourist);
      setIsInTelegram(inTg);

      if (tourist) {
        setAuthMode('telegram');
        setRegName([tourist.first_name, tourist.last_name].filter(Boolean).join(' '));
        if (tourist.username) {
          setRegTelegram(`@${tourist.username}`);
          setRegEmail(`${tourist.username.toLowerCase()}@telegram.org`);
        }
      } else {
        setAuthMode('login');
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. One-click Telegram Authentication
  const handleTelegramAuth = () => {
    if (!tgTourist) {
      setErrorMessage('Данные Telegram не обнаружены. Пожалуйста, используйте вход по Email.');
      return;
    }

    const tgIdStr = String(tgTourist.id);
    const tgClean = (tgTourist.username || '').toLowerCase().replace('@', '');

    // Check if user already exists by telegramId or telegram username or ID
    const existing = registeredUsers.find((u) => {
      const uTgClean = (u.telegram || '').toLowerCase().replace('@', '');
      const uTgId = u.telegramId ? String(u.telegramId) : '';
      return (
        (uTgId && uTgId === tgIdStr) ||
        (tgClean && uTgClean && uTgClean === tgClean) ||
        u.id === `tg-${tgTourist.id}`
      );
    });

    const isMasterSuper = tgClean === 'zuubra1985' || (existing?.email && existing.email.toLowerCase() === 'zuubra1985@gmail.com');

    if (existing) {
      // Update with fresh Telegram details if changed
      const updatedExisting: AppUser = {
        ...existing,
        telegramId: tgTourist.id,
        telegram: tgTourist.username ? `@${tgTourist.username}` : existing.telegram,
        avatar: tgTourist.photo_url || existing.avatar,
        role: isMasterSuper ? 'superadmin' : existing.role || 'user'
      };

      onRegisterUser(updatedExisting);
      onLoginSuccess(updatedExisting);
      onClose();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
      return;
    }

    // Create fresh tourist account from Telegram
    const autoUser: AppUser = {
      id: `tg-${tgTourist.id}`,
      telegramId: tgTourist.id,
      name: [tgTourist.first_name, tgTourist.last_name].filter(Boolean).join(' ') || (tgTourist.username ? `@${tgTourist.username}` : `Турист TG #${tgTourist.id}`),
      email: tgTourist.username ? `${tgTourist.username.toLowerCase()}@telegram.org` : `tg_${tgTourist.id}@splav86.ru`,
      phone: '',
      telegram: tgTourist.username ? `@${tgTourist.username}` : '',
      avatar: tgTourist.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: isMasterSuper ? 'superadmin' : 'user',
      password: '', // Can be set later in profile for web login
      registeredAt: new Date().toISOString().slice(0, 10),
      city: 'Югра / Ямал',
      experienceLevel: 'Водный турист (Telegram)',
      favoriteRouteIds: [],
      favoriteRivers: [],
      vesselsOwned: [],
      gearInventory: [],
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      vk: '',
      isReadyForExpeditions: true,
      showContactsPublicly: true
    };

    onRegisterUser(autoUser);
    onLoginSuccess(autoUser);
    onClose();
    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 2. Standard Login (Email or Telegram @username / ID)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawInput = loginIdentifier.trim();
    const cleanIdentifier = rawInput.toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Пожалуйста, введите ваш Email или Telegram логин.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Пожалуйста, введите пароль.');
      return;
    }

    const isSuperAdminEmail = cleanIdentifier === 'zuubra1985@gmail.com' || cleanIdentifier.replace('@', '') === 'zuubra1985';
    
    // Check superadmin credentials
    if (isSuperAdminEmail) {
      if (cleanPassword !== '110985DimA' && cleanPassword !== 'admin86') {
        setErrorMessage('Неверный пароль администратора. Доступ запрещен.');
        return;
      }

      const existingSuper = registeredUsers.find((u) => u.email.trim().toLowerCase() === 'zuubra1985@gmail.com');
      const canonicalId = 'user-superadmin-zuubra';
      const defaultName = 'Администратор (zuubra1985)';
      
      const superAdminUser: AppUser = existingSuper
        ? {
            ...existingSuper,
            id: canonicalId,
            name: existingSuper.name || defaultName,
            telegramId: tgTourist?.id || existingSuper.telegramId,
            telegram: tgTourist?.username ? `@${tgTourist.username}` : existingSuper.telegram || '@zuubra1985',
            role: 'superadmin'
          }
        : {
            id: canonicalId,
            email: 'zuubra1985@gmail.com',
            name: defaultName,
            phone: '+7 (922) 000-00-86',
            role: 'superadmin',
            password: cleanPassword,
            city: 'Ханты-Мансийск / Сургут',
            telegram: tgTourist?.username ? `@${tgTourist.username}` : '@zuubra1985',
            telegramId: tgTourist?.id,
            avatar: tgTourist?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            experienceLevel: 'Эксперт / Инструктор-проводник',
            registeredAt: '2026-01-01',
            favoriteRouteIds: ['sob-polar-ural', 'sosva-nyaksimvol-berezovo'],
            isReadyForExpeditions: true,
            showContactsPublicly: true
          };

      onRegisterUser(superAdminUser);
      onLoginSuccess(superAdminUser);
      onClose();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
      return;
    }

    // Flexible multi-field lookup:
    // 1) By Email
    // 2) By Telegram username (with or without @)
    // 3) By numeric Telegram ID
    // 4) By internal ID
    const cleanUsername = cleanIdentifier.replace('@', '');
    const matchedUser = registeredUsers.find((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uTg = (u.telegram || '').toLowerCase().replace('@', '');
      const uTgId = u.telegramId ? String(u.telegramId) : '';
      const uId = (u.id || '').toLowerCase();

      return (
        uEmail === cleanIdentifier ||
        (cleanUsername && uTg === cleanUsername) ||
        (uTgId && uTgId === cleanIdentifier) ||
        uId === cleanIdentifier
      );
    });

    if (!matchedUser) {
      setErrorMessage(`Пользователь «${rawInput}» не найден. Если вы еще не зарегистрированы, перейдите на вкладку «Регистрация» или используйте «Вход через Telegram».`);
      return;
    }

    // Check user password if set
    if (matchedUser.password && matchedUser.password.trim() !== '') {
      if (matchedUser.password !== cleanPassword) {
        setErrorMessage('Неверный пароль. Пожалуйста, проверьте правильность ввода.');
        return;
      }
    }

    // If logging in inside Telegram WebApp, automatically link Telegram ID to this account!
    let userToLogin = matchedUser;
    if (tgTourist) {
      userToLogin = {
        ...matchedUser,
        telegramId: tgTourist.id,
        telegram: tgTourist.username ? `@${tgTourist.username}` : matchedUser.telegram,
        avatar: tgTourist.photo_url || matchedUser.avatar
      };
      onRegisterUser(userToLogin);
    }

    // Login successful
    onLoginSuccess(userToLogin);
    onClose();
    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // 3. New User Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();
    const cleanPassword = regPassword.trim();
    const cleanTg = regTelegram.trim();

    if (!cleanName || !cleanEmail) {
      setErrorMessage('Пожалуйста, укажите ваше имя и Email адрес.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 3) {
      setErrorMessage('Пароль должен содержать не менее 3 символов.');
      return;
    }

    // Check Duplicate by Email or Telegram username
    const alreadyExists = registeredUsers.some((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uTg = (u.telegram || '').toLowerCase().replace('@', '');
      const currentTgClean = cleanTg.toLowerCase().replace('@', '');
      return uEmail === cleanEmail || (currentTgClean && uTg && uTg === currentTgClean);
    });

    if (alreadyExists) {
      setErrorMessage(`Пользователь с Email «${cleanEmail}» уже зарегистрирован! Перейдите на вкладку «Вход» и введите пароль.`);
      return;
    }

    const isSuper = cleanEmail === 'zuubra1985@gmail.com';

    // Fresh new tourist profile
    const newUser: AppUser = {
      id: tgTourist ? `tg-${tgTourist.id}` : `user-${Date.now()}`,
      telegramId: tgTourist?.id,
      email: cleanEmail,
      name: cleanName,
      password: cleanPassword,
      phone: regPhone.trim(),
      city: regCity.trim() || 'Югра / Ямал',
      role: isSuper ? 'superadmin' : 'user',
      avatar: tgTourist?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: regExperience || 'Любитель водных походов',
      registeredAt: new Date().toISOString().slice(0, 10),
      favoriteRouteIds: [],
      favoriteRivers: [],
      vesselsOwned: [],
      gearInventory: [],
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      telegram: cleanTg || (tgTourist?.username ? `@${tgTourist.username}` : ''),
      vk: '',
      isReadyForExpeditions: true,
      showContactsPublicly: true
    };

    onRegisterUser(newUser);
    onLoginSuccess(newUser);
    onClose();
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1A1F1A]">
                Авторизация в SPLAV86
              </h2>
              <p className="text-xs text-[#8B7E6D]">
                {isInTelegram ? 'Вход через Telegram или по Email' : 'Личный кабинет туриста'}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className={`grid ${tgTourist ? 'grid-cols-3' : 'grid-cols-2'} bg-[#F9F7F4] p-1 rounded-2xl border border-[#EEEBE6] text-xs font-bold gap-1`}>
          {tgTourist && (
            <button
              type="button"
              onClick={() => {
                setAuthMode('telegram');
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
                authMode === 'telegram' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#0088cc]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="truncate">Telegram</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              authMode === 'login' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Вход</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              authMode === 'register' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="truncate">Регистрация</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* OPTION 1: 1-CLICK TELEGRAM AUTH */}
        {authMode === 'telegram' && tgTourist && (
          <div className="space-y-4 text-xs pt-1">
            <div className="p-4 bg-gradient-to-br from-[#F0F8FF] to-[#E6F4FE] rounded-2xl border border-[#BEE3F8] space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={tgTourist.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                  alt="Telegram Avatar"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-[#0088cc] shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-[#1A1F1A] truncate">
                      {[tgTourist.first_name, tgTourist.last_name].filter(Boolean).join(' ') || 'Пользователь Telegram'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0088cc]/10 text-[#0088cc] font-black">
                      TG
                    </span>
                  </div>
                  <p className="text-xs text-[#0088cc] font-medium truncate">
                    {tgTourist.username ? `@${tgTourist.username}` : `ID: ${tgTourist.id}`}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[#4A5568] leading-relaxed">
                Быстрый вход в 1 клик. Ваши маршруты, походы и визитка будут автоматически привязаны к вашему профилю Telegram.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTelegramAuth}
              className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.99] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Войти через Telegram</span>
            </button>

            <div className="text-center pt-1 border-t border-[#EEEBE6]">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs text-[#2D5A27] hover:underline font-semibold cursor-pointer"
              >
                Есть аккаунт на сайте? Войти по Email и паролю →
              </button>
            </div>
          </div>
        )}

        {/* OPTION 2: LOGIN FORM (EMAIL / TELEGRAM ID) */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#4A443E] font-medium mb-1">
                Email или логин Telegram (@username / ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="name@mail.ru или @username"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl pl-9 pr-3 py-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#4A443E] font-medium mb-1">Пароль</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl pl-9 pr-3 py-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <LogIn className="w-4 h-4" />
              Войти в Личный кабинет
            </button>

            <div className="text-center pt-1 flex items-center justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage(null);
                }}
                className="text-[#2D5A27] hover:underline cursor-pointer"
              >
                Создать аккаунт
              </button>

              {tgTourist && (
                <button
                  type="button"
                  onClick={() => setAuthMode('telegram')}
                  className="text-[#0088cc] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Вход в 1 клик TG
                </button>
              )}
            </div>
          </form>
        )}

        {/* OPTION 3: REGISTER FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#4A443E] font-medium mb-1">ФИО / Имя туриста *</label>
              <input
                type="text"
                required
                placeholder="Иван Смирнов"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Email адрес *</label>
                <input
                  type="email"
                  required
                  placeholder="ivan@mail.ru"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Telegram (@логин)</label>
                <input
                  type="text"
                  placeholder="@ivan_splav"
                  value={regTelegram}
                  onChange={(e) => setRegTelegram(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Телефон</label>
                <input
                  type="text"
                  placeholder="+7 (922)..."
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Город</label>
                <input
                  type="text"
                  placeholder="Сургут / Салехард"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#4A443E] font-medium mb-1">Опыт сплавов</label>
              <select
                value={regExperience}
                onChange={(e) => setRegExperience(e.target.value)}
                className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
              >
                <option value="Начинающий (0-1 сплав)">Начинающий (0-1 сплав)</option>
                <option value="Средний (2-4 сплава)">Средний (2-4 сплава)</option>
                <option value="Опытный (5+ сплавов, пороги)">Опытный (5+ сплавов, пороги)</option>
                <option value="Эксперт / Инструктор-проводник">Эксперт / Инструктор-проводник</option>
              </select>
            </div>

            <div>
              <label className="block text-[#4A443E] font-medium mb-1">Пароль для входа на сайте и с ПК * (мин. 3 символа)</label>
              <input
                type="password"
                required
                minLength={3}
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Зарегистрироваться
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className="text-xs text-[#2D5A27] hover:underline font-semibold cursor-pointer"
              >
                Уже есть аккаунт? Войти
              </button>
            </div>
          </form>
        )}

        {/* Cross-Platform Access Guarantee Banner */}
        <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EEEBE6] text-[11px] text-[#6B665F] space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#2D5A27]">
            <Globe className="w-3.5 h-3.5" />
            <span>Единый доступ: Web-сайт + Telegram</span>
          </div>
          <p className="leading-tight">
            Вы сможете заходить в свой профиль как со смартфона через Telegram, так и с любого компьютера через сайт, используя ваш логин и пароль.
          </p>
        </div>

      </div>
    </div>
  );
};
