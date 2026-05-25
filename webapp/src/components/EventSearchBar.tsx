import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SearchResultEventCard } from '@/components/SearchResultEventCard'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from 'react-i18next'
import { navigateToEvent } from '@/utils/navigation'

export function EventSearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [overlayTop, setOverlayTop] = useState(0)
  const [overlayBottom, setOverlayBottom] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const showOverlay = isFocused
  const hasQuery = debouncedQuery.length >= 2

  const siteId = currentSite?.id ?? ''
  const { data: results = [], isLoading } = trpc.events.search.useQuery(
    { siteId, query: debouncedQuery },
    { enabled: !!currentSite && hasQuery }
  )

  useEffect(() => {
    if (!showOverlay) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const updatePosition = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setOverlayTop(rect.bottom)
      const vv = window.visualViewport
      setOverlayBottom(vv ? window.innerHeight - (vv.offsetTop + vv.height) : 0)
    }

    updatePosition()
    window.visualViewport?.addEventListener('resize', updatePosition)
    window.visualViewport?.addEventListener('scroll', updatePosition)
    return () => {
      document.body.style.overflow = ''
      window.visualViewport?.removeEventListener('resize', updatePosition)
      window.visualViewport?.removeEventListener('scroll', updatePosition)
    }
  }, [showOverlay])

  useEffect(() => {
    if (!isFocused) return
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isFocused])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false)
      setQuery('')
    }
  }

  const handleClear = () => {
    setIsFocused(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const handleResultClick = (eventId: string) => {
    setIsFocused(false)
    setQuery('')
    navigateToEvent(navigate, eventId)
  }

  if (!currentSite) return null

  return (
    <div ref={containerRef} className="relative p-1">
      <div className="relative">
        {isFocused ? (
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); handleClear() }}
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          ref={inputRef}
          className="ps-9 rounded-full bg-muted border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent placeholder:text-muted-foreground/60 h-10"
          placeholder={t('events.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showOverlay && (
        <div
          className="fixed inset-x-0 bg-background z-50 overflow-y-auto shadow-lg border-t"
          style={{ top: overlayTop, bottom: overlayBottom }}
        >
          {!hasQuery ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
              {t('events.searchStartTyping')}
            </div>
          ) : isLoading ? (
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
                <SearchResultEventCard key={event.id} event={event} onClick={() => handleResultClick(event.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
