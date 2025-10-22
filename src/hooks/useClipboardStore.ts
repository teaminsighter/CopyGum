import { useState, useEffect, useCallback } from 'react'
import { ClipboardItem } from '../types/clipboard'
import { db } from '../services/database'

interface UseClipboardStoreReturn {
  items: ClipboardItem[]
  filteredItems: ClipboardItem[]
  loading: boolean
  error: string | null
  searchQuery: string
  selectedCategory: string
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  refreshItems: (silent?: boolean) => Promise<void>
  copyItem: (item: ClipboardItem) => Promise<void>
  clearAll: () => Promise<void>
  getUniqueTypes: () => string[]
  getAllCategories: () => Promise<string[]>
}

export function useClipboardStore(): UseClipboardStoreReturn {
  console.log('🔧 useClipboardStore hook initialized')
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Load items from database
  const refreshItems = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError(null)
      const dbItems = await db.getClipboardItems(1000) // Load more items to show real count
      setItems(dbItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clipboard items')
      console.error('Error loading clipboard items:', err)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  // Filter items based on search and category
  const filteredItems = useCallback(() => {
    let filtered = items

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        (item.source && item.source.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.type === selectedCategory)
    }

    return filtered
  }, [items, searchQuery, selectedCategory])()

  // Copy item to clipboard
  const copyItem = useCallback(async (item: ClipboardItem) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.setClipboardText(item.content)
      } else {
        // Fallback for web
        await navigator.clipboard.writeText(item.content)
      }
    } catch (err) {
      console.error('Failed to copy item:', err)
      throw new Error('Failed to copy to clipboard')
    }
  }, [])

  // Clear all items
  const clearAll = useCallback(async () => {
    try {
      await db.clearAllClipboardItems()
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear items')
      console.error('Error clearing clipboard items:', err)
    }
  }, [])

  // Get unique types for category filtering
  const getUniqueTypes = useCallback(() => {
    const types = new Set(items.map(item => item.type))
    return Array.from(types).sort()
  }, [items])

  // Get all available categories (types + custom categories)
  const getAllCategories = useCallback(async () => {
    try {
      // Get clipboard item types
      const types = getUniqueTypes()
      
      // Get custom categories from database
      const customCategories = await db.getCategories()
      const customCategoryNames = customCategories.map(cat => cat.name)
      
      // Combine and return unique categories
      const allCategories = [...types, ...customCategoryNames]
      return [...new Set(allCategories)].sort()
    } catch (error) {
      console.error('Failed to get categories:', error)
      return getUniqueTypes()
    }
  }, [getUniqueTypes])

  // Listen for new clipboard items from Electron
  useEffect(() => {
    console.log('🔧 Setting up clipboard listener, electronAPI:', !!window.electronAPI)
    if (!window.electronAPI) return

    const handleClipboardChanged = (data: { content: string; timestamp: number; type: string; source?: string }) => {
      console.log('📱 React: Received clipboard change:', {
        content: data.content.substring(0, 50) + '...',
        type: data.type,
        source: data.source
      })
      
      const newItem: ClipboardItem = {
        id: `clipboard-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        content: data.content,
        type: data.type as any,
        timestamp: data.timestamp,
        source: data.source || 'System'
      }

      // Add to database (it handles duplicates internally)
      db.addClipboardItem(newItem).then(() => {
        // Refresh items silently to include new/updated item
        refreshItems(true) // silent refresh to avoid loading state
      }).catch(err => {
        console.error('Failed to save clipboard item:', err)
      })
    }

    window.electronAPI.onClipboardChanged(handleClipboardChanged)

    return () => {
      window.electronAPI.removeAllListeners('clipboard-changed')
    }
  }, [refreshItems])

  // Load items on mount
  useEffect(() => {
    refreshItems()
  }, [refreshItems])

  // Debounce search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Search is already handled in filteredItems calculation
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  return {
    items,
    filteredItems,
    loading,
    error,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    refreshItems,
    copyItem,
    clearAll,
    getUniqueTypes,
    getAllCategories
  }
}