import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import './i18next.d.ts' // Import type declarations

// Import translations
import { enTranslation } from '../locales/en/translation'
import { arTranslation } from '../locales/ar/translation'
import { heTranslation } from '../locales/he/translation'

export const languages = {
  en: {
    name: 'English',
    dir: 'ltr' as const,
    nativeName: 'English'
  },
  ar: {
    name: 'Arabic',
    dir: 'rtl' as const,
    nativeName: 'العربية'
  },
  he: {
    name: 'Hebrew',
    dir: 'rtl' as const,
    nativeName: 'עברית'
  }
}

export type Language = keyof typeof languages
export type Direction = 'ltr' | 'rtl'

const resources = {
  en: { translation: enTranslation },
  ar: { translation: arTranslation },
  he: { translation: heTranslation }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    debug: false,

    // TypeScript options
    returnNull: false,
    returnEmptyString: false,

    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n

// Helper to get direction for a language
export function getLanguageDirection(language: string): Direction {
  return languages[language as Language]?.dir || 'ltr'
}

// Helper to get all available languages
export function getAvailableLanguages() {
  return Object.entries(languages).map(([code, lang]) => ({
    code,
    ...lang
  }))
}