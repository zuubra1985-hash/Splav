import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  X, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Globe, 
  Send,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { initTelegramWebApp, TelegramTourist, isTelegramWebApp } from '../utils/telegramWebApp';
import { CloudSqlDbService } from '../services/cloudSqlDb';

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
  onRegisterUser
}) => {
  // Modes: 'login' (Вход по Email) or 'register' (Регистрация по Email)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [tgTourist, setTgTourist] = useState<TelegramTourist | null>(null);
  const [isInTelegram, setIsInTelegram] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register fields (Strict Email-first registration)
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Сургут');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regExperience, setRegExperience] = useState<string>('Любитель водных походов');
  const [regTelegram, setRegTelegram] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check Telegram runtime on open for autofill & account linking
  useEffect(() => {
    if (isOpen) {
      const tourist = initTelegramWebApp();
      const inTg = isTelegramWebApp() || Boolean(tourist);
      setTgTourist(tourist);
      setIsInTelegram(inTg);

      if (tourist) {
        const tgName = [tourist.first_name, tourist.last_name].filter(Boolean).join(' ');
        if (tgName) setRegName((prev) => prev || tgName);
        if (tourist.username) setRegTelegram((prev) => prev || `@${tourist.username}`);
      }

      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Standard Login by Email (and Password)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail) {
      setErrorMessage('Пожалуйста, введите ваш Email для входа.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Пожалуйста, введите пароль.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await CloudSqlDbService.login(cleanEmail, cleanPassword);
      const user = response.user as AppUser;

      // Link Telegram identity if in TMA
      if (tgTourist) {
        user.telegramId = tgTourist.id;
        user.telegram = tgTourist.username ? `@${tgTourist.username}` : user.telegram;
        user.avatar = tgTourist.photo_url || user.avatar;
        try {
          await CloudSqlDbService.updateCurrentUser({
            telegram: user.telegram,
            avatar: user.avatar
          });
        } catch {}
      }

      onRegisterUser(user);
      onLoginSuccess(user);
      onClose();

      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Неверный email или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Strict Email-First Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();
    const cleanTg = regTelegram.trim();

    if (!cleanName) {
      setErrorMessage('Пожалуйста, укажите ваше имя или ФИО.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Пожалуйста, укажите корректный рабочий Email адрес.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 3) {
      setErrorMessage('Пароль должен содержать не менее 3 символов.');
      return;
    }

    if (cleanConfirm && cleanPassword !== cleanConfirm) {
      setErrorMessage('Введенные пароли не совпадают.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await CloudSqlDbService.register({
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        phone: regPhone.trim(),
        city: regCity.trim() || 'Югра / Ямал',
        experienceLevel: regExperience || 'Любитель водных походов',
        telegram: cleanTg || (tgTourist?.username ? `@${tgTourist.username}` : '')
      });

      const user = response.user as AppUser;

      if (tgTourist) {
        user.telegramId = tgTourist.id;
        user.telegram = tgTourist.username ? `@${tgTourist.username}` : user.telegram;
        user.avatar = tgTourist.photo_url || user.avatar;
      }

      onRegisterUser(user);
      onLoginSuccess(user);
      onClose();

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl my-auto text-[#2D332D] animate-fade-in">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1A1F1A]">
                {authMode === 'login' ? 'Вход в SPLAV86' : 'Регистрация туриста'}
              </h2>
              <p className="text-xs text-[#8B7E6D]">
                Единая защищенная авторизация по Email
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

        {/* Telegram Notice Banner if inside TMA */}
        {isInTelegram && tgTourist && (
          <div className="p-3 bg-[#E6F4FE] border border-[#BEE3F8] rounded-2xl flex items-center gap-2.5 text-xs text-[#006699]">
            <Send className="w-4 h-4 shrink-0 text-[#0088cc]" />
            <div className="leading-tight">
              <span>Вы вошли через Telegram: <strong>{tgTourist.first_name}</strong> {tgTourist.username ? `(@${tgTourist.username})` : ''}.</span>
              <p className="text-[11px] opacity-85 mt-0.5">
                Авторизуйтесь по Email или зарегистрируйтесь, и профиль навсегда свяжется с вашим Telegram!
              </p>
            </div>
          </div>
        )}

        {/* Strict Tabs: Вход | Регистрация */}
        <div className="grid grid-cols-2 bg-[#F9F7F4] p-1 rounded-2xl border border-[#EEEBE6] text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              authMode === 'login' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Вход по Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              authMode === 'register' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Регистрация</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#4A443E] font-medium mb-1">
                Ваш Email адрес *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="ivan@mail.ru"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl pl-9 pr-3 py-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#4A443E] font-medium mb-1">Пароль *</label>
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
              disabled={isLoading}
              className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{isLoading ? 'Вход...' : 'Войти в Личный кабинет'}</span>
            </button>

            <div className="text-center pt-1 text-xs">
              <span className="text-[#8B7E6D]">Ещё нет аккаунта? </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage(null);
                }}
                className="text-[#2D5A27] font-bold hover:underline cursor-pointer"
              >
                Зарегистрироваться по Email →
              </button>
            </div>
          </form>
        )}

        {/* 2. STRICT REGISTRATION FORM */}
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
                <label className="block text-[#4A443E] font-medium mb-1">Email (основной логин) *</label>
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
                <label className="block text-[#4A443E] font-medium mb-1">Telegram (@логин для связи)</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Пароль для входа *</label>
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
              <div>
                <label className="block text-[#4A443E] font-medium mb-1">Повторите пароль *</label>
                <input
                  type="password"
                  required
                  minLength={3}
                  placeholder="••••••••"
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{isLoading ? 'Регистрация...' : 'Зарегистрировать аккаунт'}</span>
            </button>

            <div className="text-center pt-1 text-xs">
              <span className="text-[#8B7E6D]">Уже есть аккаунт? </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className="text-[#2D5A27] font-bold hover:underline cursor-pointer"
              >
                Войти по Email →
              </button>
            </div>
          </form>
        )}

        {/* Unified Database Guarantee Banner */}
        <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EEEBE6] text-[11px] text-[#6B665F] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#2D5A27]">
            <Globe className="w-3.5 h-3.5" />
            <span>Строгая единая база пользователей</span>
          </div>
          <p className="leading-tight">
            Один аккаунт — один Email. Ваши личные треки и заявки надежно защищены и доступны только вам.
          </p>
        </div>

      </div>
    </div>
  );
};
