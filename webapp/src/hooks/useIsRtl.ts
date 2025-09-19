import { useTranslation } from 'react-i18next'

/**
 * Hook to determine if the current language is RTL
 * @returns true if the current language is RTL (Arabic or Hebrew)
 */
export function useIsRtl(): boolean {
  const { i18n } = useTranslation()
  return i18n.language === 'ar' || i18n.language === 'he'
}