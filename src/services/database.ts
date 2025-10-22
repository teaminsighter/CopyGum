import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { ClipboardItem, Category, Settings } from '../types/clipboard'

interface ClipFlowDB extends DBSchema {
  clipboardItems: {
    key: string
    value: ClipboardItem
    indexes: { 'by-timestamp': number; 'by-type': string; 'by-category': string }
  }
  categories: {
    key: string
    value: Category
  }
  settings: {
    key: string
    value: Settings
  }
}

class DatabaseService {
  private db: IDBPDatabase<ClipFlowDB> | null = null

  async init(): Promise<void> {
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts) {
      try {
        attempts++
        console.log(`🔄 Attempting to initialize IndexedDB (attempt ${attempts}/${maxAttempts})...`)
        
        this.db = await openDB<ClipFlowDB>('ClipFlowDB', 1, {
          upgrade(db) {
            console.log('📦 Setting up database schema...')
            
            // Clipboard items store
            if (!db.objectStoreNames.contains('clipboardItems')) {
              const clipboardStore = db.createObjectStore('clipboardItems', {
                keyPath: 'id'
              })
              clipboardStore.createIndex('by-timestamp', 'timestamp')
              clipboardStore.createIndex('by-type', 'type')
              clipboardStore.createIndex('by-category', 'category')
              console.log('✅ Created clipboardItems store')
            }

            // Categories store
            if (!db.objectStoreNames.contains('categories')) {
              db.createObjectStore('categories', {
                keyPath: 'id'
              })
              console.log('✅ Created categories store')
            }

            // Settings store
            if (!db.objectStoreNames.contains('settings')) {
              db.createObjectStore('settings', {
                keyPath: 'id'
              })
              console.log('✅ Created settings store')
            }
          },
          blocked() {
            console.warn('⚠️ Database upgrade blocked by another tab')
          },
          blocking() {
            console.warn('⚠️ This tab is blocking a database upgrade')
          }
        })
        
        console.log('✅ IndexedDB initialized successfully!')
        return // Success, exit the retry loop
        
      } catch (error) {
        console.error(`❌ Failed to initialize IndexedDB (attempt ${attempts}):`, error)
        
        if (attempts >= maxAttempts) {
          console.error('❌ All IndexedDB initialization attempts failed')
          // Don't throw error, use fallback localStorage
          console.log('🔄 Falling back to localStorage for persistence')
          this.db = null
          return
        }
        
        // Wait before retrying
        console.log(`⏳ Waiting 1 second before retry...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // localStorage fallback methods
  private getFromLocalStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(`clipflow-${key}`)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private saveToLocalStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(`clipflow-${key}`, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  async findClipboardItemByContent(content: string): Promise<ClipboardItem | null> {
    if (!this.db) {
      // Fallback to localStorage
      const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
      return items.find(item => item.content === content) || null
    }
    
    const items = await this.getClipboardItems(1000) // Search through more items
    return items.find(item => item.content === content) || null
  }

  async addClipboardItem(item: ClipboardItem): Promise<void> {
    // Check for existing item with same content
    console.log('📝 Checking for duplicate content:', item.content.substring(0, 50) + '...')
    const existingItem = await this.findClipboardItemByContent(item.content)
    
    if (existingItem) {
      console.log('🔄 Smart Copy: Found duplicate content, updating existing item:', {
        content: item.content.substring(0, 50) + '...',
        existingCategories: existingItem.categories,
        existingPinned: existingItem.isPinned,
        existingId: existingItem.id,
        newId: item.id
      })
      
      // Update existing item: preserve metadata but update timestamp
      const updatedItem: ClipboardItem = {
        ...existingItem, // Keep all existing metadata (categories, isPinned, etc.)
        timestamp: item.timestamp, // Update to current timestamp
        source: item.source || existingItem.source, // Update source if provided
        type: item.type || existingItem.type // Update type if provided
      }
      
      if (!this.db) {
        // Fallback to localStorage for update
        const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
        const index = items.findIndex(i => i.id === existingItem.id)
        if (index >= 0) {
          items[index] = updatedItem
          // Move updated item to top
          items.splice(index, 1)
          items.unshift(updatedItem)
          this.saveToLocalStorage('clipboardItems', items)
        }
        return
      }
      
      await this.updateClipboardItem(updatedItem)
      return
    }
    
    // No duplicate found, add as new item
    console.log('✅ Smart Copy: Adding new item:', {
      content: item.content.substring(0, 50) + '...',
      type: item.type,
      source: item.source
    })
    
    if (!this.db) {
      // Fallback to localStorage
      const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
      items.unshift(item) // Add to beginning
      items.splice(100) // Keep only 100 items
      this.saveToLocalStorage('clipboardItems', items)
      return
    }
    
    await this.db.add('clipboardItems', item)
    
    // Check if we need to clean up old items
    await this.cleanupOldItems()
  }

  async getClipboardItems(limit = 100): Promise<ClipboardItem[]> {
    if (!this.db) {
      // Fallback to localStorage
      const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
      return items.slice(0, limit)
    }
    
    const tx = this.db.transaction('clipboardItems', 'readonly')
    const index = tx.store.index('by-timestamp')
    const items = await index.getAll()
    
    // Sort by timestamp (newest first) and limit
    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  async getClipboardItemsByType(type: string): Promise<ClipboardItem[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction('clipboardItems', 'readonly')
    const index = tx.store.index('by-type')
    return await index.getAll(type)
  }

  async getClipboardItemsByCategory(category: string): Promise<ClipboardItem[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tx = this.db.transaction('clipboardItems', 'readonly')
    const index = tx.store.index('by-category')
    return await index.getAll(category)
  }

  async updateClipboardItem(item: ClipboardItem): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
      const index = items.findIndex(i => i.id === item.id)
      if (index >= 0) {
        items[index] = item
        this.saveToLocalStorage('clipboardItems', items)
      }
      return
    }
    
    await this.db.put('clipboardItems', item)
  }

  async deleteClipboardItem(id: string): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      const items = this.getFromLocalStorage<ClipboardItem>('clipboardItems')
      const filtered = items.filter(i => i.id !== id)
      this.saveToLocalStorage('clipboardItems', filtered)
      return
    }
    
    await this.db.delete('clipboardItems', id)
  }

  async clearAllClipboardItems(): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      this.saveToLocalStorage('clipboardItems', [])
      return
    }
    
    await this.db.clear('clipboardItems')
  }

  async searchClipboardItems(query: string): Promise<ClipboardItem[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const items = await this.getClipboardItems(500)
    const lowerQuery = query.toLowerCase()
    
    return items.filter(item => 
      item.content.toLowerCase().includes(lowerQuery) ||
      item.type.toLowerCase().includes(lowerQuery) ||
      (item.category && item.category.toLowerCase().includes(lowerQuery)) ||
      (item.source && item.source.toLowerCase().includes(lowerQuery))
    )
  }

  async addCategory(category: Category): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      const categories = this.getFromLocalStorage<Category>('categories')
      categories.push(category)
      this.saveToLocalStorage('categories', categories)
      return
    }
    
    await this.db.add('categories', category)
  }

  async getCategories(): Promise<Category[]> {
    if (!this.db) {
      // Fallback to localStorage
      return this.getFromLocalStorage<Category>('categories')
    }
    
    return await this.db.getAll('categories')
  }

  async updateCategory(category: Category): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    await this.db.put('categories', category)
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    await this.db.delete('categories', id)
  }

  async getSettings(): Promise<Settings> {
    if (!this.db) throw new Error('Database not initialized')
    
    const settings = await this.db.get('settings', 'main')
    
    if (!settings) {
      // Return default settings
      const defaultSettings: Settings = {
        maxItems: 500,
        autoDeleteDays: 30,
        shortcut: 'Ctrl+Shift+V',
        privacyMode: false,
        passwordLock: false,
        theme: 'dark'
      }
      
      await this.updateSettings(defaultSettings)
      return defaultSettings
    }
    
    return settings
  }

  async updateSettings(settings: Settings): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const settingsWithId = { ...settings, id: 'main' } as Settings & { id: string }
    await this.db.put('settings', settingsWithId)
  }

  private async cleanupOldItems(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const settings = await this.getSettings()
    const items = await this.getClipboardItems(1000)
    
    // Helper function to check if item should be protected from deletion
    const isProtectedItem = (item: ClipboardItem): boolean => {
      return Boolean(item.isPinned) || // Never delete pinned items
             Boolean(item.categories && item.categories.length > 0) // Never delete categorized items
    }
    
    // Remove items beyond max limit (keep pinned and categorized items)
    if (items.length > settings.maxItems) {
      const deletableItems = items.filter(item => !isProtectedItem(item))
      const itemsToDelete = deletableItems.slice(settings.maxItems)
      
      for (const item of itemsToDelete) {
        await this.deleteClipboardItem(item.id)
      }
    }
    
    // Remove items older than autoDeleteDays (keep pinned and categorized items)
    const cutoffDate = Date.now() - (settings.autoDeleteDays * 24 * 60 * 60 * 1000)
    const oldItems = items.filter(item => 
      item.timestamp < cutoffDate && !isProtectedItem(item)
    )
    
    for (const item of oldItems) {
      await this.deleteClipboardItem(item.id)
    }
  }
}

export const db = new DatabaseService()