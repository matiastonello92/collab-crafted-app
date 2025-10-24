import { useState, useEffect } from 'react'

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export function useBreakpoint() {
  const [isClient, setIsClient] = useState(false)
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')
  
  useEffect(() => {
    setIsClient(true)
    
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width >= BREAKPOINTS['2xl']) setBreakpoint('2xl')
      else if (width >= BREAKPOINTS.xl) setBreakpoint('xl')
      else if (width >= BREAKPOINTS.lg) setBreakpoint('lg')
      else if (width >= BREAKPOINTS.md) setBreakpoint('md')
      else setBreakpoint('sm')
    }
    
    updateBreakpoint()
    const mql = window.matchMedia('(min-width: 0px)')
    mql.addEventListener('change', updateBreakpoint)
    return () => mql.removeEventListener('change', updateBreakpoint)
  }, [])
  
  return {
    breakpoint: isClient ? breakpoint : 'lg',
    isMobile: isClient ? (breakpoint === 'sm' || breakpoint === 'md') : false,
    isTablet: isClient ? (breakpoint === 'md' || breakpoint === 'lg') : false,
    isDesktop: isClient ? (breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl') : true,
    isHydrated: isClient,
  }
}
