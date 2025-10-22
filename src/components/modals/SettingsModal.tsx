import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings, AppSettings } from '../../hooks/useSettings'
import CategoryCustomization from './CategoryCustomization'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'general' | 'storage' | 'privacy' | 'appearance' | 'customization' | 'about'

function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, saveSettings, loading } = useSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Update local settings when settings change
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await saveSettings(localSettings)
      if (success) {
        showToast('Settings saved')
        setTimeout(() => onClose(), 500)
      } else {
        showToast('Failed to save settings')
      }
    } catch (error) {
      showToast('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  const updateLocalSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'storage', label: 'Storage', icon: '💾' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'customization', label: 'Customization', icon: '📋' },
    { id: 'about', label: 'About', icon: 'ℹ️' }
  ]

  if (loading) {
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end"
          onClick={onClose}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="w-full max-h-[85vh] bg-black/90 backdrop-blur-xl border-t border-white/20 rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="text-2xl font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 px-6 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Keyboard Shortcut
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={localSettings.keyboardShortcut}
                        onChange={(e) => updateLocalSetting('keyboardShortcut', e.target.value)}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        placeholder="Ctrl+Shift+V"
                      />
                      <button className="px-3 py-2 bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded-lg hover:bg-blue-500/30">
                        Edit
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Global hotkey to show/hide ClipFlow</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Auto-start</div>
                      <div className="text-sm text-gray-400">Launch ClipFlow when system starts</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('autoStart', !localSettings.autoStart)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.autoStart ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.autoStart ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Show notifications</div>
                      <div className="text-sm text-gray-400">Display system notifications for actions</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('showNotifications', !localSettings.showNotifications)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.showNotifications ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.showNotifications ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Storage Tab */}
              {activeTab === 'storage' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Unlimited storage</div>
                      <div className="text-sm text-gray-400">Store unlimited clipboard items</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('unlimitedStorage', !localSettings.unlimitedStorage)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.unlimitedStorage ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.unlimitedStorage ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {!localSettings.unlimitedStorage && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Maximum items
                      </label>
                      <select
                        value={localSettings.maxItems}
                        onChange={(e) => updateLocalSetting('maxItems', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                      >
                        <option value={100}>100 items</option>
                        <option value={250}>250 items</option>
                        <option value={500}>500 items</option>
                        <option value={1000}>1000 items</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Auto-delete older than
                    </label>
                    <select
                      value={localSettings.autoDeleteDays}
                      onChange={(e) => updateLocalSetting('autoDeleteDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Storage location
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={localSettings.storagePath || 'Default (IndexedDB)'}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none"
                        placeholder="Default location"
                      />
                      <button
                        onClick={async () => {
                          if (window.electronAPI) {
                            try {
                              const result = await window.electronAPI.selectFolder()
                              if (result && !result.canceled && result.filePaths[0]) {
                                updateLocalSetting('storagePath', result.filePaths[0])
                              }
                            } catch (error) {
                              console.error('Failed to select folder:', error)
                            }
                          } else {
                            // Web fallback - show info
                            alert('Folder selection is only available in the desktop app')
                          }
                        }}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded hover:bg-blue-500/30 text-xs transition-colors"
                      >
                        Browse
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Choose where to store clipboard data files</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-medium mb-2">Storage usage</div>
                    <div className="text-sm text-gray-400">
                      {localSettings.storagePath 
                        ? `Storing data in: ${localSettings.storagePath}`
                        : 'Currently storing data locally using IndexedDB'
                      }
                    </div>
                  </div>

                  <button className="w-full py-3 px-4 bg-red-500/20 text-red-300 border border-red-400/50 rounded-lg hover:bg-red-500/30 transition-colors">
                    Clear All History
                  </button>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Hide passwords</div>
                      <div className="text-sm text-gray-400">Automatically hide password-like content</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('hidePasswords', !localSettings.hidePasswords)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.hidePasswords ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.hidePasswords ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Password lock</div>
                      <div className="text-sm text-gray-400">Require password to access ClipFlow</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('passwordLock', !localSettings.passwordLock)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.passwordLock ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.passwordLock ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {localSettings.passwordLock && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Lock password
                      </label>
                      <input
                        type="password"
                        value={localSettings.lockPassword}
                        onChange={(e) => updateLocalSetting('lockPassword', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        placeholder="Enter password"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Auto-lock after
                    </label>
                    <select
                      value={localSettings.autoLockMinutes}
                      onChange={(e) => updateLocalSetting('autoLockMinutes', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Theme
                    </label>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => updateLocalSetting('theme', 'dark')}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          localSettings.theme === 'dark'
                            ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                            : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        🌙 Dark
                      </button>
                      <button
                        onClick={() => updateLocalSetting('theme', 'light')}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          localSettings.theme === 'light'
                            ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                            : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        ☀️ Light
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Card size
                    </label>
                    <div className="flex space-x-3">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateLocalSetting('cardSize', size)}
                          className={`flex-1 p-3 rounded-lg border transition-colors capitalize ${
                            localSettings.cardSize === size
                              ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                              : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Compact mode</div>
                      <div className="text-sm text-gray-400">Reduce padding and margins</div>
                    </div>
                    <button
                      onClick={() => updateLocalSetting('compactMode', !localSettings.compactMode)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localSettings.compactMode ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        localSettings.compactMode ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Customization Tab */}
              {activeTab === 'customization' && (
                <CategoryCustomization 
                  onCategoryOrderChange={(categories) => {
                    // Categories order changed, this will be picked up by PanelHeader
                    console.log('Category order changed:', categories)
                  }}
                />
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">ClipFlow</h3>
                    <p className="text-gray-400">Version 1.0.0</p>
                  </div>

                  <div className="space-y-3">
                    <button className="w-full p-3 bg-white/10 rounded-lg text-left hover:bg-white/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">🐙</span>
                        <div>
                          <div className="text-white font-medium">View on GitHub</div>
                          <div className="text-sm text-gray-400">Source code and updates</div>
                        </div>
                      </div>
                    </button>

                    <button className="w-full p-3 bg-white/10 rounded-lg text-left hover:bg-white/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">🐛</span>
                        <div>
                          <div className="text-white font-medium">Report a bug</div>
                          <div className="text-sm text-gray-400">Help us improve ClipFlow</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="text-center text-sm text-gray-400">
                    Made with ❤️ for productivity
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-white/10 px-6 py-3">
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 bg-white/10 text-white border border-white/20 rounded text-sm hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2 px-3 bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded text-sm hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center space-x-1">
                      <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-green-500/20 text-green-300 border border-green-400/50 rounded-lg backdrop-blur-lg"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal