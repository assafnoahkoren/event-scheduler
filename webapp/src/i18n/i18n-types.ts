import { enTranslation } from '../locales/en/translation'

// Infer the Translation type from the actual translation object
export type Translation = typeof enTranslation

// Helper type to extract all possible translation keys
type PathKeys<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? PathKeys<T[K], P extends '' ? `${K & string}` : `${P}.${K & string}`>
        : P extends ''
        ? `${K & string}`
        : `${P}.${K & string}`
    }[keyof T]
  : never

export type TranslationKey = PathKeys<Translation>