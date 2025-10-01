/**
 * Application Logger
 * 
 * Centralized logging utility with environment-aware behavior.
 * Only logs in development mode to avoid cluttering production.
 */

const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

/**
 * Log debug messages (development only)
 */
export function debug(message: string, context?: LogContext) {
  if (isDev) {
    console.log(`[DEBUG] ${message}`, context || '')
  }
}

/**
 * Log info messages (development only)
 */
export function info(message: string, context?: LogContext) {
  if (isDev) {
    console.info(`[INFO] ${message}`, context || '')
  }
}

/**
 * Log warnings (always logged)
 */
export function warn(message: string, context?: LogContext) {
  console.warn(`[WARN] ${message}`, context || '')
}

/**
 * Log errors (always logged)
 */
export function error(message: string, err?: Error | unknown, context?: LogContext) {
  console.error(`[ERROR] ${message}`, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
  })
}

/**
 * Create a namespaced logger for specific modules
 */
export function createLogger(namespace: string) {
  return {
    debug: (msg: string, ctx?: LogContext) => debug(`[${namespace}] ${msg}`, ctx),
    info: (msg: string, ctx?: LogContext) => info(`[${namespace}] ${msg}`, ctx),
    warn: (msg: string, ctx?: LogContext) => warn(`[${namespace}] ${msg}`, ctx),
    error: (msg: string, err?: Error | unknown, ctx?: LogContext) => 
      error(`[${namespace}] ${msg}`, err, ctx),
  }
}

export default {
  debug,
  info,
  warn,
  error,
  createLogger,
}