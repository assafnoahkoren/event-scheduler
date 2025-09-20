import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Language {
  code: string
  name: string
  nativeName: string
  countryCode: string
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

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (languageCode: string) => {
    // Change the language in i18next
    i18n.changeLanguage(languageCode)

    // Save the preference with our custom key
    localStorage.setItem('userLanguagePreference', languageCode)

    // Also save for i18next to remember the language
    localStorage.setItem('i18nextLng', languageCode)

    // Set the direction for RTL languages
    const dir = languageCode === 'ar' || languageCode === 'he' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = languageCode
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

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