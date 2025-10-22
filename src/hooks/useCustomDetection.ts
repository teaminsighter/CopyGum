import { useEffect } from 'react'
import { useSettings } from './useSettings'

/**
 * Hook that automatically syncs custom detection rules with the Electron main process
 * whenever the settings change. This ensures that content detection in the main process
 * stays up-to-date with user preferences.
 */
export function useCustomDetection() {
  const { settings } = useSettings()

  useEffect(() => {
    // Only sync if we have electronAPI and custom detection rules
    if (window.electronAPI && settings.customDetectionRules) {
      // Sync the custom detection rules with the main process
      window.electronAPI.updateCustomDetectionRules(settings.customDetectionRules)
        .then(() => {
          console.log('✅ Custom detection rules synced with main process')
        })
        .catch((error) => {
          console.error('❌ Failed to sync custom detection rules:', error)
        })
    }
  }, [settings.customDetectionRules])

  return {
    customDetectionRules: settings.customDetectionRules
  }
}