// Конфигурация i18next для фронтенда.  Загружает файлы переводов и
// определяет язык по параметрам initData (если запущено из Telegram) или
// языку браузера.  Поддерживаются русская и английская локализации.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

// Determine default language from Telegram initData or navigator
const defaultLang = ((): string => {
  // Try to read from Telegram init data in the URL
  const params = new URLSearchParams(window.location.search);
  const initData = params.get('initData');
  try {
    if (initData) {
      const decoded = decodeURIComponent(initData);
      const kv = new URLSearchParams(decoded);
      const lang = kv.get('language_code');
      if (lang && lang.startsWith('ru')) return 'ru';
    }
  } catch (e) {
    // ignore
  }
  const navLang = navigator.language || 'en';
  return navLang.startsWith('ru') ? 'ru' : 'en';
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;