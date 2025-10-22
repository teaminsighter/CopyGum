import { useState, useEffect, useCallback } from 'react'

export interface CustomDetectionRule {
  id: string
  name: string
  pattern: string
  type: string
  enabled: boolean
  description?: string
}

export interface AppSettings {
  // General
  keyboardShortcut: string
  autoStart: boolean
  showNotifications: boolean
  
  // Storage
  maxItems: number
  autoDeleteDays: number
  storagePath: string
  unlimitedStorage: boolean
  
  // Privacy
  hidePasswords: boolean
  passwordLock: boolean
  lockPassword: string
  autoLockMinutes: number
  
  // Appearance
  theme: 'dark' | 'light'
  cardSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  
  // Custom Detection Rules
  customDetectionRules: CustomDetectionRule[]
}

const DEFAULT_SETTINGS: AppSettings = {
  keyboardShortcut: 'Ctrl+Shift+V',
  autoStart: false,
  showNotifications: true,
  maxItems: 100,
  autoDeleteDays: 30,
  storagePath: '',
  unlimitedStorage: false,
  hidePasswords: false,
  passwordLock: false,
  lockPassword: '',
  autoLockMinutes: 15,
  theme: 'dark',
  cardSize: 'medium',
  compactMode: false,
  customDetectionRules: [
    {
      id: 'password-1',
      name: 'Strong Password',
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      type: 'password',
      enabled: false,
      description: 'Detects passwords with at least 8 characters, including uppercase, lowercase, number, and special character'
    },
    {
      id: 'credit-card-1',
      name: 'Credit Card Number',
      pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$',
      type: 'credit-card',
      enabled: false,
      description: 'Detects major credit card numbers (Visa, MasterCard, Amex, etc.)'
    },
    {
      id: 'phone-1',
      name: 'Phone Number',
      pattern: '^[+]?[(]?[0-9\\s\\-\\(\\)]{10,}$',
      type: 'phone',
      enabled: false,
      description: 'Detects phone numbers in various formats'
    }
  ]
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('clipflow-settings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      localStorage.setItem('clipflow-settings', JSON.stringify(updatedSettings))
      
      // If electron API is available, also save to electron store
      if (window.electronAPI) {
        // Could implement electron-store here in the future
      }
      
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  }, [settings])

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    return saveSettings({ [key]: value })
  }, [saveSettings])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    return saveSettings(DEFAULT_SETTINGS)
  }, [saveSettings])

  // Custom detection rule management
  const addCustomDetectionRule = useCallback((rule: Omit<CustomDetectionRule, 'id'>) => {
    const newRule: CustomDetectionRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    const updatedRules = [...settings.customDetectionRules, newRule]
    return saveSettings({ customDetectionRules: updatedRules })
  }, [settings.customDetectionRules, saveSettings])

  const updateCustomDetectionRule = useCallback((id: string, updates: Partial<CustomDetectionRule>) => {
    const updatedRules = settings.customDetectionRules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    )
    return saveSettings({ customDetectionRules: updatedRules })
  }, [settings.customDetectionRules, saveSettings])

  const deleteCustomDetectionRule = useCallback((id: string) => {
    const updatedRules = settings.customDetectionRules.filter(rule => rule.id !== id)
    return saveSettings({ customDetectionRules: updatedRules })
  }, [settings.customDetectionRules, saveSettings])

  const toggleCustomDetectionRule = useCallback((id: string) => {
    return updateCustomDetectionRule(id, { 
      enabled: !settings.customDetectionRules.find(rule => rule.id === id)?.enabled 
    })
  }, [updateCustomDetectionRule, settings.customDetectionRules])

  return {
    settings,
    loading,
    saveSettings,
    updateSetting,
    resetSettings,
    addCustomDetectionRule,
    updateCustomDetectionRule,
    deleteCustomDetectionRule,
    toggleCustomDetectionRule
  }
}