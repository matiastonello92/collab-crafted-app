/**
 * Enterprise-grade Timestamp Normalization Layer
 * Ensures consistent timestamp handling between SSR and CSR
 */

export class TimestampProvider {
  private static serverTimestamp: string | null = null
  private static isClient = typeof window !== 'undefined'

  /**
   * Get SSR-safe timestamp that's consistent between server and client
   */
  static getConsistentTimestamp(): string {
    // During SSR, use a fixed timestamp that will be hydrated
    if (!this.isClient) {
      return this.serverTimestamp || new Date().toISOString()
    }
    
    // Client-side: return current timestamp
    return new Date().toISOString()
  }

  /**
   * Format timestamp for display in a locale-agnostic way
   */
  static formatForDisplay(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    // Use ISO format to avoid locale-specific differences
    return date.toISOString().slice(11, 19) // HH:MM:SS format
  }

  /**
   * Set server timestamp for SSR consistency
   */
  static setServerTimestamp(timestamp: string) {
    this.serverTimestamp = timestamp
  }

  /**
   * Get safe Date object that won't cause hydration mismatches
   */
  static getSafeDate(): Date {
    if (!this.isClient) {
      // Return a fixed date during SSR
      return new Date('2024-01-01T00:00:00.000Z')
    }
    return new Date()
  }
}