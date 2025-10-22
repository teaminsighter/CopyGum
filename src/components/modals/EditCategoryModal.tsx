import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardItem } from '../../types/clipboard'
import { getAppIcon, getTypeIcon, getTypeColor } from '../../utils/appIcons'
// Removed: import { useClipboardStore } from '../../hooks/useClipboardStore'
import { db } from '../../services/database'

interface EditCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  item: ClipboardItem | null
  onItemUpdated?: () => void // Callback to refresh items
}

function EditCategoryModal({ isOpen, onClose, item, onItemUpdated }: EditCategoryModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && item) {
      // Set initial selected categories
      setSelectedCategories(item.category ? [item.category] : [])
      
      // Load existing categories from database
      loadExistingCategories()
    }
  }, [isOpen, item])

  const loadExistingCategories = async () => {
    try {
      const categories = await db.getCategories()
      setExistingCategories(categories.map(cat => cat.name))
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    const categoryName = newCategoryName.trim()
    
    if (existingCategories.includes(categoryName)) {
      alert('Category already exists!')
      return
    }

    try {
      // Create new category in database
      await db.addCategory({
        id: `category-${Date.now()}`,
        name: categoryName,
        color: '#3b82f6', // Default blue color
        items: []
      })

      // Add to existing categories list
      setExistingCategories(prev => [...prev, categoryName])
      
      // Auto-select the new category
      setSelectedCategories(prev => [...prev, categoryName])
      
      // Clear input
      setNewCategoryName('')
    } catch (error) {
      console.error('Failed to create category:', error)
      alert('Failed to create category')
    }
  }

  const handleSave = async () => {
    if (!item) return

    setIsLoading(true)
    
    try {
      const updatedItem: ClipboardItem = {
        ...item,
        category: selectedCategories.length > 0 ? selectedCategories[0] : undefined // For now, use first selected category
      }

      await db.updateClipboardItem(updatedItem)
      onItemUpdated?.()
      onClose()
    } catch (error) {
      console.error('Failed to update item:', error)
      alert('Failed to save changes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  if (!item) return null

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const truncateContent = (content: string, maxLength: number = 60): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
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
            className="w-full max-h-[80vh] bg-black/90 backdrop-blur-xl border-t border-white/20 rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="px-6 pb-6 max-h-[75vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Edit Categories</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Card Preview */}
              <div className="mb-6 p-4 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
                <div className="flex items-center space-x-3 mb-3">
                  <span className={`px-2 py-1 rounded-lg text-xs border flex items-center space-x-1 ${getTypeColor(item.type)}`}>
                    <span>{getTypeIcon(item.type)}</span>
                    <span className="capitalize">{item.type}</span>
                  </span>
                  <div className="text-lg">{getAppIcon(item.source)}</div>
                  <span className="text-xs text-white/60">{formatTimestamp(item.timestamp)}</span>
                </div>
                <div className="text-white text-sm">
                  {truncateContent(item.content)}
                </div>
              </div>

              {/* Assign Categories */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-4">Assign Categories</h3>
                
                {existingCategories.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {existingCategories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center space-x-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="w-4 h-4 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-white">{category}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <div className="text-4xl mb-2">📁</div>
                    <p>No categories created yet</p>
                    <p className="text-sm">Create your first category below</p>
                  </div>
                )}

                {/* Create New Category */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-green-400 font-medium">Create new category:</span>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCategory()
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-white/15"
                    />
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-400/50 rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default EditCategoryModal