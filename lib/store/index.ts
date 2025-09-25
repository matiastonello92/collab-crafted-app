// Compatibility export - unified store replacing both old stores
export { 
  useAppStore,
  useAppContext,
  useLocationContext, 
  usePerformanceMetrics,
  useContextActions,
  usePerformanceMonitor
} from './unified'

// Legacy compatibility
export { useAppStore as useModernStore } from './unified'