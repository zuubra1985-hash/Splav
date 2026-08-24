/**
 * Telegram Mini App (TMA) Integration for Splav86
 * Bot: @SSplav86_bot
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
          auth_date?: string;
          hash?: string;
          start_param?: string;
        };
      };
    };
  }
}

export interface TelegramTourist {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  start_param?: string;
}

/**
 * Checks if current runtime is inside Telegram WebApp
 */
export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
};

/**
 * Initialize Telegram Mini App environment
 */
export const initTelegramWebApp = (): TelegramTourist | null => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return null;
  }

  const tg = window.Telegram.WebApp;

  try {
    // Notify Telegram that WebApp is loaded and ready to be displayed
    tg.ready();

    // Automatically expand to fill the maximum screen height on mobile/desktop
    tg.expand();

    // Enable closing confirmation so accidental swipes do not lose user data
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }

    // Set styling header and background colors to northern green theme
    if (typeof tg.setHeaderColor === 'function') {
      tg.setHeaderColor('#2D5A27');
    }
    if (typeof tg.setBackgroundColor === 'function') {
      tg.setBackgroundColor('#F5F2ED');
    }

    const user = tg.initDataUnsafe?.user;
    if (user) {
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        language_code: user.language_code,
        start_param: tg.initDataUnsafe?.start_param
      };
    }
  } catch (err) {
    console.warn('Telegram WebApp initialization notice:', err);
  }

  return null;
};

/**
 * Trigger native haptic feedback in Telegram
 */
export const telegramHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error' | 'selection' = 'light'
) => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp?.HapticFeedback) return;

  try {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    if (type === 'selection') {
      haptic.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {
    // Fallback ignore if unsupported
  }
};

/**
 * Setup Telegram native back button
 */
export const setupTelegramBackButton = (onBack: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp?.BackButton) {
    return () => {};
  }

  const backButton = window.Telegram.WebApp.BackButton;
  backButton.show();
  backButton.onClick(onBack);

  return () => {
    backButton.offClick(onBack);
    backButton.hide();
  };
};

/**
 * Setup Telegram native main action button (at bottom)
 */
export const setupTelegramMainButton = (params: {
  text: string;
  onClick: () => void;
  color?: string;
  textColor?: string;
  isVisible?: boolean;
}): (() => void) => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp?.MainButton) {
    return () => {};
  }

  const mainBtn = window.Telegram.WebApp.MainButton;
  mainBtn.setParams({
    text: params.text,
    color: params.color || '#2D5A27',
    text_color: params.textColor || '#FFFFFF',
    is_visible: params.isVisible !== false,
    is_active: true
  });

  mainBtn.onClick(params.onClick);

  return () => {
    mainBtn.offClick(params.onClick);
    mainBtn.hide();
  };
};

/**
 * Open external or internal Telegram link
 */
export const openTelegramLink = (url: string) => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    if (url.startsWith('https://t.me/') || url.startsWith('tg://')) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.Telegram.WebApp.openLink(url);
    }
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
