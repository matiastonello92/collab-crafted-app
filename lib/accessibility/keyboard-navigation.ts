import { useEffect, useCallback } from 'react'

export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const

export function useKeyboardNavigation(
  ref: React.RefObject<HTMLElement>,
  options: {
    onEnter?: () => void
    onEscape?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
    onArrowLeft?: () => void
    onArrowRight?: () => void
  }
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case KEYBOARD_KEYS.ENTER:
          options.onEnter?.()
          break
        case KEYBOARD_KEYS.ESCAPE:
          options.onEscape?.()
          break
        case KEYBOARD_KEYS.ARROW_UP:
          event.preventDefault()
          options.onArrowUp?.()
          break
        case KEYBOARD_KEYS.ARROW_DOWN:
          event.preventDefault()
          options.onArrowDown?.()
          break
        case KEYBOARD_KEYS.ARROW_LEFT:
          options.onArrowLeft?.()
          break
        case KEYBOARD_KEYS.ARROW_RIGHT:
          options.onArrowRight?.()
          break
      }
    },
    [options]
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('keydown', handleKeyDown)
    return () => element.removeEventListener('keydown', handleKeyDown)
  }, [ref, handleKeyDown])
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== KEYBOARD_KEYS.TAB) return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => container.removeEventListener('keydown', handleTabKey)
  }, [containerRef, isActive])
}

export function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

export function getAriaLabel(context: string, item: any): string {
  switch (context) {
    case 'shift':
      return `Shift for ${item.role || 'staff'} on ${item.date}, ${item.start_time} to ${item.end_time}`
    case 'leave-request':
      return `Leave request from ${item.start_date} to ${item.end_date}, status: ${item.status}`
    case 'timesheet':
      return `Timesheet for week ${item.week_number}, total hours: ${item.total_hours}, status: ${item.status}`
    default:
      return ''
  }
}
