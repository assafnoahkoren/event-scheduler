// Translation type definition based on the English translation structure
// This extracts the shape but not the literal values

import { enTranslation } from '../locales/en/translation'

// Recursive type to extract the shape of the translation object
type TranslationShape<T> = T extends readonly string
  ? string
  : T extends readonly (infer U)[]
  ? readonly U[]
  : T extends object
  ? { [K in keyof T]: TranslationShape<T[K]> }
  : T

export type TranslationType = TranslationShape<typeof enTranslation>