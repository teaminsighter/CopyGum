export interface ClipboardItem {
  id: string
  content: string
  type: ClipboardItemType
  timestamp: number
  source?: string
  category?: string
  categories?: string[] // Support multiple categories
  isPinned?: boolean
  metadata?: {
    appName?: string
    windowTitle?: string
    url?: string
  }
}

export type ClipboardItemType = 
  | 'text' 
  | 'code' 
  | 'color' 
  | 'url' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'api'
  | 'image'

export interface Category {
  id: string
  name: string
  color: string
  items: string[] // Array of clipboard item IDs
}

export interface Settings {
  maxItems: number
  autoDeleteDays: number
  shortcut: string
  privacyMode: boolean
  passwordLock: boolean
  theme: 'dark' | 'light'
}