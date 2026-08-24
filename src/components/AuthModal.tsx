import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';
import { ShieldCheck, Mail, Lock, Phone, MapPin, CheckCircle2, X, Sparkles, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register fields
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Сургут');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regExperience, setRegExperience] = useState<string>('Любитель водных походов');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail) {
      setErrorMessage('Пожалуйста, введите ваш Email адрес.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Пожалуйста, введите пароль.');
      return;
    }

    const isSuperAdminEmail = cleanEmail === 'zuubra1985@gmail.com' || cleanEmail === 'novichek2@narod.ru';
    
    // 1. Check superadmin credentials
    if (isSuperAdminEmail) {
      if (cleanPassword !== '110985DimA' && cleanPassword !== 'admin86') {
        setErrorMessage('Неверный пароль администратора. Доступ запрещен.');
        return;
      }

      // Check if superadmin is already in registeredUsers
      const existingSuper = registeredUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);
      const canonicalId = cleanEmail === 'zuubra1985@gmail.com' ? 'user-superadmin-zuubra' : 'user-superadmin-novichek';
      const defaultName = cleanEmail === 'zuubra1985@gmail.com' ? 'Администратор (zuubra1985)' : 'Главный Администратор (Дмитрий)';
      
      const superAdminUser: AppUser = existingSuper
        ? {
            ...existingSuper,
            id: canonicalId,
            name: existingSuper.name && existingSuper.name !== 'Главный Администратор (novichek2)' ? existingSuper.name : defaultName,
            role: 'superadmin'
          }
        : {
            id: canonicalId,
            email: cleanEmail,
            name: defaultName,
            phone: '+7 (922) 000-00-86',
            role: 'superadmin',
            password: cleanPassword,
            city: 'Ханты-Мансийск / Сургут',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            experienceLevel: 'Эксперт / Инструктор-проводник',
            registeredAt: '2026-01-01',
            favoriteRouteIds: ['sob-polar-ural', 'sosva-nyaksimvol-berezovo'],
            isReadyForExpeditions: true,
            showContactsPublicly: true
          };

      onLoginSuccess(superAdminUser);
      onClose();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {
        console.log(e);
      }
      return;
    }

    // 2. Strict Check: User MUST be already registered!
    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!existing) {
      setErrorMessage(`Пользователь с адресом «${cleanEmail}» не найден в базе. Если вы еще не зарегистрированы, пожалуйста, перейдите на вкладку «Регистрация» и создайте аккаунт.`);
      return;
    }

    // 3. Check user password
    if (existing.password && existing.password.trim() !== '' && existing.password !== cleanPassword) {
      setErrorMessage('Неверный пароль. Пожалуйста, проверьте правильность ввода пароля.');
      return;
    }

    // Login successful
    onLoginSuccess(existing);
    onClose();
    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (e) {
      console.log(e);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();
    const cleanPassword = regPassword.trim();

    if (!cleanName || !cleanEmail) {
      setErrorMessage('Пожалуйста, укажите ваше имя и Email адрес.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 3) {
      setErrorMessage('Пароль должен содержать не менее 3 символов.');
      return;
    }

    // 1. Strict Duplicate Check: Cannot register existing email!
    const alreadyExists = registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (alreadyExists) {
      setErrorMessage(`Пользователь с Email «${cleanEmail}» уже зарегистрирован в Splav86! Пожалуйста, перейдите на вкладку «Вход» и введите пароль.`);
      return;
    }

    const isSuper = cleanEmail === 'zuubra1985@gmail.com' || cleanEmail === 'novichek2@narod.ru';

    // 2. Fresh new tourist profile with clean sheet
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      password: cleanPassword,
      phone: regPhone.trim(),
      city: regCity.trim() || 'Югра / Ямал',
      role: isSuper ? 'superadmin' : 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: regExperience || 'Начинающий турист',
      registeredAt: new Date().toISOString().slice(0, 10),
      favoriteRouteIds: [],
      favoriteRivers: [],
      vesselsOwned: [],
      gearInventory: [],
      badges: [],
      bio: '',
      callsign: '',
      fstrRank: '',
      telegram: '',
      vk: '',
      isReadyForExpeditions: true,
      showContactsPublicly: true
    };

    onRegisterUser(newUser);
    onLoginSuccess(newUser);
    onClose();
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-6 space-y-5 shadow-2xl my-auto text-[#2D332D]">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#E8F1E7] text-[#2D5A27]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1A1F1A]">
                {authMode === 'login' ? 'Вход в Личный кабинет' : 'Регистрация в Splav86'}
              </h2>
              <p className="text-xs text-[#8B7E6D]">
                {authMode === 'login' ? 'Только для зарегистрированных пользователей' : 'Создайте новый чистый аккаунт туриста'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 bg-[#F9F7F4] p-1 rounded-2xl border border-[#EEEBE6] text-xs font-bold">
          <button
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Вход
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#6B665F] hover:text-[#2D5A27]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Регистрация
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#4A443E] font-medium mb-1">Email адрес</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B7E6D] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="name@mail.ru"
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
              className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Войти в Личный кабинет
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage(null);
                }}
                className="text-xs text-[#2D5A27] hover:underline font-semibold cursor-pointer"
              >
                Нет аккаунта? Зарегистрироваться
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
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
                <label className="block text-[#4A443E] font-medium mb-1">Город / Населенный пункт</label>
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
              <label className="block text-[#4A443E] font-medium mb-1">Пароль для входа * (мин. 3 символа)</label>
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

      </div>
    </div>
  );
};
