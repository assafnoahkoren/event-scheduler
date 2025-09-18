import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getLanguageDirection, type Language, type Direction } from '@/i18n'

interface LanguageContextType {
  language: Language
  direction: Direction
  changeLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState<Language>(i18n.language as Language || 'en')
  const [direction, setDirection] = useState<Direction>(getLanguageDirection(language))

  useEffect(() => {
    // Update direction when language changes
    const dir = getLanguageDirection(language)
    setDirection(dir)

    // Update HTML attributes
    document.documentElement.lang = language
    document.documentElement.dir = dir

    // Update body class for Tailwind CSS
    document.body.classList.remove('ltr', 'rtl')
    document.body.classList.add(dir)
  }, [language])

  const changeLanguage = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang)
      setLanguage(lang)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, direction, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}