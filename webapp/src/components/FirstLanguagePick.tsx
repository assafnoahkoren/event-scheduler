import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

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

export function FirstLanguagePick() {
  const { i18n } = useTranslation()

  const handleLanguageSelect = (languageCode: string) => {
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

    // Reload to show the login form
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Globe className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-4">Event Scheduler</CardTitle>
          <CardDescription className="text-lg mt-2">
            Please select your preferred language
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform rounded-xl bg-slate-100 border-0"
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <div className="w-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-50 outline-4 outline-slate-200">
                  <img
                    src={`https://kapowaz.github.io/square-flags/flags/${lang.countryCode.toLowerCase()}.svg`}
                    alt={`${lang.name} flag`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{lang.nativeName}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}