'use client'

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Network } from '@capacitor/network'

/**
 * Capacitor Native Utilities
 * Utilities for native mobile features (only active in Capacitor native apps)
 */

export const isNative = () => Capacitor.isNativePlatform()
export const getPlatform = () => Capacitor.getPlatform()

/**
 * Status Bar Configuration
 */
export async function setupStatusBar(theme: 'light' | 'dark' = 'dark') {
  if (!isNative()) return

  try {
    await StatusBar.setStyle({ 
      style: theme === 'dark' ? Style.Dark : Style.Light 
    })
    
    // Set background color based on theme
    if (getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ 
        color: theme === 'dark' ? '#0F172A' : '#FFFFFF' 
      })
    }
  } catch (error) {
    console.warn('StatusBar setup failed:', error)
  }
}

/**
 * Keyboard Configuration
 */
export async function setupKeyboard() {
  if (!isNative()) return

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Ionic })
  } catch (error) {
    console.warn('Keyboard setup failed:', error)
  }
}

/**
 * Android Back Button Handler
 */
export function setupBackButton(
  onBackButton?: () => boolean | void
) {
  if (!isNative() || getPlatform() !== 'android') return

  App.addListener('backButton', ({ canGoBack }) => {
    // Custom handler - if returns true, prevent default
    if (onBackButton && onBackButton()) {
      return
    }

    // Default: go back if possible, otherwise exit
    if (!canGoBack) {
      App.exitApp()
    }
  })
}

/**
 * Haptic Feedback
 */
export async function hapticImpact(style: ImpactStyle = ImpactStyle.Medium) {
  if (!isNative()) return
  
  try {
    await Haptics.impact({ style })
  } catch (error) {
    // Silently fail if haptics not available
  }
}

export async function hapticLight() {
  return hapticImpact(ImpactStyle.Light)
}

export async function hapticMedium() {
  return hapticImpact(ImpactStyle.Medium)
}

export async function hapticHeavy() {
  return hapticImpact(ImpactStyle.Heavy)
}

/**
 * Network Status
 */
export async function getNetworkStatus() {
  if (!isNative()) {
    return { connected: navigator.onLine, connectionType: 'unknown' }
  }

  try {
    const status = await Network.getStatus()
    return status
  } catch (error) {
    console.warn('Network status check failed:', error)
    return { connected: true, connectionType: 'unknown' }
  }
}

export function onNetworkChange(callback: (status: { connected: boolean }) => void) {
  if (!isNative()) return

  Network.addListener('networkStatusChange', callback)
}
