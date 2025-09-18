import React, { createContext, useContext, useState, useEffect } from 'react'

type Direction = 'ltr' | 'rtl'

interface DirectionContextType {
  direction: Direction
  toggleDirection: () => void
  setDirection: (direction: Direction) => void
}

const DirectionContext = createContext<DirectionContextType | undefined>(undefined)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirectionState] = useState<Direction>(() => {
    const savedDirection = localStorage.getItem('app-direction') as Direction
    return savedDirection || 'ltr'
  })

  useEffect(() => {
    document.documentElement.dir = direction
    document.documentElement.setAttribute('lang', direction === 'rtl' ? 'ar' : 'en')
    localStorage.setItem('app-direction', direction)
  }, [direction])

  const toggleDirection = () => {
    setDirectionState(prev => prev === 'ltr' ? 'rtl' : 'ltr')
  }

  const setDirection = (newDirection: Direction) => {
    setDirectionState(newDirection)
  }

  return (
    <DirectionContext.Provider value={{ direction, toggleDirection, setDirection }}>
      {children}
    </DirectionContext.Provider>
  )
}

export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}