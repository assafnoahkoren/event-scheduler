import { enTranslation } from './locales/en/translation'
import { arTranslation } from './locales/ar/translation'
import { heTranslation } from './locales/he/translation'

// Define the translation structure (keys only, values are strings)
export interface TranslationType {
  serviceCategories: {
    [key in 'photography' | 'catering' | 'music' | 'decoration' | 'venue' |
            'flowers' | 'transportation' | 'coordination' | 'security' |
            'lighting' | 'videography' | 'makeup' | 'rental' | 'printing' | 'other']: {
      name: string
      description: string
    }
  }
  organization: {
    defaultName: string
    defaultNameFromEmail: string
  }
}

export type SupportedLanguage = 'en' | 'ar' | 'he'

const translations: Record<SupportedLanguage, TranslationType> = {
  en: enTranslation as TranslationType,
  ar: arTranslation as TranslationType,
  he: heTranslation as TranslationType,
}

export class I18n {
  private language: SupportedLanguage
  private translation: TranslationType

  constructor(language: SupportedLanguage = 'en') {
    this.language = this.validateLanguage(language)
    this.translation = translations[this.language]
  }

  private validateLanguage(lang: string): SupportedLanguage {
    if (lang in translations) {
      return lang as SupportedLanguage
    }
    // Fallback to English if language not supported
    return 'en'
  }

  setLanguage(language: SupportedLanguage) {
    this.language = this.validateLanguage(language)
    this.translation = translations[this.language]
  }

  t(key: string): string {
    const keys = key.split('.')
    let value: any = this.translation

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to English if key not found
        value = this.getFromLanguage('en', keys)
        break
      }
    }

    return typeof value === 'string' ? value : key
  }

  private getFromLanguage(lang: SupportedLanguage, keys: string[]): string {
    let value: any = translations[lang]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return keys.join('.')
      }
    }

    return typeof value === 'string' ? value : keys.join('.')
  }

  // Get all translations for a specific section
  getSection<K extends keyof TranslationType>(section: K): TranslationType[K] {
    return this.translation[section]
  }

  // Get current language
  getLanguage(): SupportedLanguage {
    return this.language
  }
}

// Create a singleton instance for default use
export const i18n = new I18n()

// Helper function to create an i18n instance with specific language
export function createI18n(language: SupportedLanguage = 'en'): I18n {
  return new I18n(language)
}