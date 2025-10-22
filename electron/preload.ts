import { contextBridge, ipcRenderer } from 'electron'

export interface CustomDetectionRule {
  id: string
  name: string
  pattern: string
  type: string
  enabled: boolean
  description?: string
}

export interface ElectronAPI {
  getClipboardText: () => Promise<string>
  setClipboardText: (text: string) => Promise<void>
  hideOverlay: () => Promise<void>
  getScreenSize: () => Promise<{ width: number; height: number }>
  setDragState: (isActive: boolean) => Promise<void>
  updateCustomDetectionRules: (rules: CustomDetectionRule[]) => Promise<void>
  selectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>
  onShowPanel: (callback: () => void) => void
  onHidePanel: (callback: () => void) => void
  onClipboardChanged: (callback: (data: ClipboardItem) => void) => void
  removeAllListeners: (channel: string) => void
}

export interface ClipboardItem {
  content: string
  timestamp: number
  type: string
}

const electronAPI: ElectronAPI = {
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text: string) => ipcRenderer.invoke('set-clipboard-text', text),
  hideOverlay: () => ipcRenderer.invoke('hide-overlay'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  setDragState: (isActive: boolean) => ipcRenderer.invoke('set-drag-state', isActive),
  updateCustomDetectionRules: (rules: CustomDetectionRule[]) => ipcRenderer.invoke('update-custom-detection-rules', rules),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  onShowPanel: (callback: () => void) => {
    ipcRenderer.on('show-panel', callback)
  },
  
  onHidePanel: (callback: () => void) => {
    ipcRenderer.on('hide-panel', callback)
  },
  
  onClipboardChanged: (callback: (data: ClipboardItem) => void) => {
    ipcRenderer.on('clipboard-changed', (_, data) => callback(data))
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}