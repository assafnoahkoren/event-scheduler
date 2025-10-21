import { useState, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/**
 * Custom hook that persists state to localStorage
 * @param key - localStorage key to store the value
 * @param defaultValue - Default value if nothing is in localStorage
 * @returns Tuple of [state, setState] similar to useState
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from localStorage or use default value
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      if (item) {
        return JSON.parse(item) as T
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
    return defaultValue
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error)
    }
  }, [key, state])

  return [state, setState]
}
