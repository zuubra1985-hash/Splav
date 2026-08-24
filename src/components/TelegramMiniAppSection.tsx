import React, { useState } from 'react';
import { 
  Send, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Compass, 
  HelpCircle,
  QrCode,
  Zap,
  Globe,
  Bot
} from 'lucide-react';
import { isTelegramWebApp, telegramHaptic } from '../utils/telegramWebApp';

interface TelegramMiniAppSectionProps {
  onShowNotification?: (msg: string) => void;
}

export const TelegramMiniAppSection: React.FC<TelegramMiniAppSectionProps> = ({
  onShowNotification
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const isInsideTelegram = isTelegramWebApp();

  const botUsername = 'SSplav86_bot';
  const botLink = `https://t.me/${botUsername}`;
  const webAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://splav86.ai.studio';
  const directMiniAppUrl = `https://t.me/${botUsername}/app`;

  const copyToClipboard = (text: string, key: string, label: string) => {
    telegramHaptic('light');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (onShowNotification) {
        onShowNotification(`Скопировано: ${label}`);
      }
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#1F401A] via-[#2D5A27] to-[#1B3617] p-6 sm:p-8 rounded-[28px] text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Telegram Mini App (TMA) • Готово к запуску</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Интеграция с ботом @{botUsername}
            </h2>

            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              Splav86 полноценно работает как нативное мини-приложение внутри Telegram на iOS, Android и Desktop. 
              Туристы получают доступ ко всем картам, лоциям, спутниковым трекам и поиску попутчиков в один клик без ввода паролей.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => telegramHaptic('medium')}
              className="px-5 py-3 bg-white text-[#2D5A27] hover:bg-stone-100 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#2D5A27]" />
              <span>Открыть @{botUsername}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <button
              type="button"
              onClick={() => copyToClipboard(botLink, 'bot_link', 'Ссылка на бота')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedKey === 'bot_link' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'bot_link' ? 'Скопировано!' : 'Копировать ссылку'}</span>
            </button>
          </div>
        </div>

        {/* Runtime Status Indicator */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-300">Текущий режим работы:</span>
            {isInsideTelegram ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Внутри Telegram Mini App
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-stone-200 font-medium">
                <Globe className="w-3.5 h-3.5 text-stone-300" />
                Веб-браузер (TMA SDK активен и готов к запуску в боте)
              </span>
            )}
          </div>

          <div className="text-stone-300 text-[11px]">
            Бот: <strong className="text-white">@{botUsername}</strong>
          </div>
        </div>
      </div>

      {/* 3 Core Advantages Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8F1E7] border border-[#CDE0CC] flex items-center justify-center text-[#2D5A27]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A1F1A]">Бесшовная авторизация</h3>
          <p className="text-xs text-[#6B665F] leading-relaxed">
            Telegram передает проверенный профиль (ID, имя, username, аватарку). Профиль туриста создается автоматически без пароля.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EBF2FA] border border-[#CBDDF0] flex items-center justify-center text-[#2B4C7E]">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A1F1A]">Нативный опыт и Haptic</h3>
          <p className="text-xs text-[#6B665F] leading-relaxed">
            Поддержка системной кнопки «Назад», тактильной вибрации (Haptic Feedback), полноэкранного режима и защиты от случайного закрытия.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FEF6E9] border border-[#F5E2C4] flex items-center justify-center text-[#B87A28]">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A1F1A]">100% функционала карт</h3>
          <p className="text-xs text-[#6B665F] leading-relaxed">
            Интерактивные слои спутника и топографии, скачивание GPX, расчет раскладки продуктов и журнал рек работают прямо в мессенджере.
          </p>
        </div>
      </div>

      {/* Step-by-Step Setup Guide in BotFather */}
      <div className="bg-white p-6 sm:p-7 rounded-[28px] border border-[#E5E0D8] shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-[#1A1F1A] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#2D5A27]" />
            <span>Инструкция по настройке кнопки меню в @BotFather</span>
          </h3>
          <p className="text-xs text-[#6B665F] mt-1">
            Выполните 3 простых шага в диалоге с @BotFather, чтобы в вашем боте появилась постоянная кнопка меню <strong>«🗺️ Открыть карту и маршруты»</strong>.
          </p>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1A1F1A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-[11px]">1</span>
                <span>Откройте @BotFather и выберите команду /setmenubutton</span>
              </span>
              <button
                onClick={() => copyToClipboard('/setmenubutton', 'cmd1', '/setmenubutton')}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-[#D9D1C5] hover:border-[#2D5A27] text-[#2D5A27] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'cmd1' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cmd1' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <p className="text-xs text-[#6B665F]">
              Отправьте в @BotFather команду <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-[#2D5A27]">/setmenubutton</code> и выберите вашего бота <strong>@{botUsername}</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1A1F1A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-[11px]">2</span>
                <span>Укажите URL адрес опубликованного сайта</span>
              </span>
              <button
                onClick={() => copyToClipboard(webAppUrl, 'cmd2', 'URL сайта')}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-[#D9D1C5] hover:border-[#2D5A27] text-[#2D5A27] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'cmd2' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cmd2' ? 'Скопировано' : 'Копировать URL'}</span>
              </button>
            </div>
            <p className="text-xs text-[#6B665F]">
              BotFather попросит отправить ссылку на веб-приложение. Вставьте:
            </p>
            <div className="p-2.5 bg-white rounded-xl border border-stone-200 font-mono text-xs text-[#2D5A27] break-all select-all">
              {webAppUrl}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-[#F9F7F4] border border-[#EEEBE6] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1A1F1A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2D5A27] text-white flex items-center justify-center text-[11px]">3</span>
                <span>Задайте название кнопки меню</span>
              </span>
              <button
                onClick={() => copyToClipboard('🗺️ Открыть карту и маршруты', 'cmd3', 'Текст кнопки')}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-[#D9D1C5] hover:border-[#2D5A27] text-[#2D5A27] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'cmd3' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cmd3' ? 'Скопировано' : 'Копировать текст'}</span>
              </button>
            </div>
            <p className="text-xs text-[#6B665F]">
              Отправьте название кнопки для интерфейса Telegram:
            </p>
            <div className="p-2.5 bg-white rounded-xl border border-stone-200 font-bold text-xs text-[#1A1F1A]">
              🗺️ Открыть карту и маршруты
            </div>
          </div>
        </div>

        {/* Telegram Direct Link Generator */}
        <div className="p-5 rounded-2xl bg-[#E8F1E7]/50 border border-[#CDE0CC] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2D5A27]">
            <Send className="w-4 h-4" />
            <span>Прямая ссылка для отправки в каналы и чаты:</span>
          </div>
          <p className="text-xs text-[#6B665F]">
            Размещайте эту ссылку в постах вашего Telegram-канала, чатах туристов или кнопках-закрепах:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={botLink}
              className="flex-1 px-3.5 py-2.5 bg-white rounded-xl border border-[#CDE0CC] text-xs font-mono text-[#2D5A27] select-all outline-none"
            />
            <button
              onClick={() => copyToClipboard(botLink, 'share_bot', 'Ссылка на бота')}
              className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              {copiedKey === 'share_bot' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'share_bot' ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
