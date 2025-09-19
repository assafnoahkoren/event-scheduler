import type { NavigateFunction } from 'react-router-dom'

/**
 * Navigate to an event detail page
 * @param navigate - React Router navigate function
 * @param eventId - The ID of the event to view
 */
export function navigateToEvent(navigate: NavigateFunction, eventId: string) {
  navigate(`/event/${eventId}`)
}

/**
 * Navigate to home page
 * @param navigate - React Router navigate function
 */
export function navigateToHome(navigate: NavigateFunction) {
  navigate('/')
}