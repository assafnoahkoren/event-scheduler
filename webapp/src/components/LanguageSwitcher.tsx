import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/utils/trpc'
import { useAuth } from '@/contexts/AuthContext'

interface Language {
  code: string
  name: string
  nativeName: string
  countryCode: string
}

interface LanguageSwitcherProps {
  variant?: 'default' | 'sidebar'
}

const languages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    countryCode: 'US'
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    countryCode: 'IL'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    countryCode: 'SA'
  }
]

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const { user } = useAuth()
  const updateLanguageMutation = trpc.auth.updateLanguage.useMutation()

  const handleLanguageChange = async (languageCode: string) => {
    // Change the language in i18next
    i18n.changeLanguage(languageCode)

    // Set the direction for RTL languages
    const dir = languageCode === 'ar' || languageCode === 'he' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = languageCode

    // If user is logged in, save to database
    if (user) {
      try {
        await updateLanguageMutation.mutateAsync({
          language: languageCode as 'en' | 'he' | 'ar'
        })
      } catch (error) {
        console.error('Failed to update language preference:', error)
      }
    } else {
      // For non-logged in users, save to localStorage
      localStorage.setItem('i18nextLng', languageCode)
    }
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  if (variant === 'sidebar') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start">
            <div className="w-4 h-4 rounded-full overflow-hidden me-2">
              <img
                src={`https://kapowaz.github.io/square-flags/flags/${currentLanguage.countryCode.toLowerCase()}.svg`}
                alt={`${currentLanguage.name} flag`}
                className="w-full h-full object-contain"
              />
            </div>
            {t('common.language')}
            <span className="ms-auto text-xs text-muted-foreground">{currentLanguage.nativeName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <img
                  src={`https://kapowaz.github.io/square-flags/flags/${lang.countryCode.toLowerCase()}.svg`}
                  alt={`${lang.name} flag`}
                  className="w-full h-full object-contain"
                />
              </div>
              <span>{lang.nativeName}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="w-5 rounded-full overflow-hidden">
            <img
              src={`https://kapowaz.github.io/square-flags/flags/${currentLanguage.countryCode.toLowerCase()}.svg`}
              alt={`${currentLanguage.name} flag`}
              className="w-full h-full object-contain"
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center gap-2"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img
                src={`https://kapowaz.github.io/square-flags/flags/${lang.countryCode.toLowerCase()}.svg`}
                alt={`${lang.name} flag`}
                className="w-full h-full object-contain"
              />
            </div>
            <span>{lang.nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}