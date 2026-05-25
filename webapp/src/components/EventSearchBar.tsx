import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EventCard } from '@/components/EventCard'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from 'react-i18next'

export function EventSearchBar() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [overlayTop, setOverlayTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const showOverlay = isFocused && query.length >= 2

  const { data: results = [], isLoading } = trpc.events.search.useQuery(
    { siteId: currentSite!.id, query: debouncedQuery },
    { enabled: showOverlay && debouncedQuery.length >= 2 }
  )

  useEffect(() => {
    if (showOverlay && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOverlayTop(rect.bottom)
    }
  }, [showOverlay])

  useEffect(() => {
    if (!isFocused) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isFocused])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false)
      setQuery('')
    }
  }

  const handleResultClick = () => {
    setIsFocused(false)
    setQuery('')
  }

  if (!currentSite) return null

  return (
    <div ref={containerRef} className="relative px-4 pt-3 pb-1">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-9"
          placeholder={t('events.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showOverlay && (
        <div
          className="fixed inset-x-0 bottom-0 bg-white z-50 overflow-y-auto shadow-lg border-t"
          style={{ top: overlayTop }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              {t('events.searchNoResults')}
            </div>
          ) : (
            <div className="divide-y">
              {results.map(event => (
                <div key={event.id} onClick={handleResultClick}>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
