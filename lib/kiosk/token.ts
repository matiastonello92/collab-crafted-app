// Klyra Shifts - Kiosk Anti-Spoofing Token System

import crypto from 'crypto'

const KIOSK_SECRET = process.env.KIOSK_SECRET || 'default-kiosk-secret-change-me'
const TOKEN_VALIDITY_HOURS = 24

export interface KioskToken {
  location_id: string
  issued_at: number
  expires_at: number
  signature: string
}

/**
 * Generate a signed kiosk token for a location
 */
export function generateKioskToken(locationId: string): string {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + TOKEN_VALIDITY_HOURS * 60 * 60 * 1000

  const payload = JSON.stringify({
    location_id: locationId,
    issued_at: issuedAt,
    expires_at: expiresAt
  })

  const signature = crypto
    .createHmac('sha256', KIOSK_SECRET)
    .update(payload)
    .digest('hex')

  const token: KioskToken = {
    location_id: locationId,
    issued_at: issuedAt,
    expires_at: expiresAt,
    signature
  }

  return Buffer.from(JSON.stringify(token)).toString('base64')
}

/**
 * Verify and decode a kiosk token
 */
export function verifyKioskToken(token: string): {
  valid: boolean
  locationId?: string
  error?: string
} {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    const { location_id, issued_at, expires_at, signature } = decoded as KioskToken

    // Check expiration
    if (Date.now() > expires_at) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify signature
    const payload = JSON.stringify({ location_id, issued_at, expires_at })
    const expectedSignature = crypto
      .createHmac('sha256', KIOSK_SECRET)
      .update(payload)
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true, locationId: location_id }
  } catch (error) {
    return { valid: false, error: 'Invalid token format' }
  }
}
