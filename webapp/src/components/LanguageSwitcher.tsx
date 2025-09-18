import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { getAvailableLanguages } from '@/i18n'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage()
  const languages = getAvailableLanguages()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code as any)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="me-2">{lang.nativeName}</span>
            {lang.dir === 'rtl' && (
              <span className="text-xs text-muted-foreground">(RTL)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}