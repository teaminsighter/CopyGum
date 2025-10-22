import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../services/database'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (categoryName: string) => void
}

const PRESET_COLORS = [
  // Blues
  { name: 'Sky Blue', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Navy', value: '#1e40af' },
  
  // Greens
  { name: 'Emerald', value: '#10b981' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Forest', value: '#166534' },
  
  // Purples
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Magenta', value: '#c026d3' },
  
  // Pinks & Reds
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Crimson', value: '#dc2626' },
  
  // Oranges & Yellows
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Gold', value: '#ca8a04' },
  
  // Teals & Cyans
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Mint', value: '#059669' },
  { name: 'Sage', value: '#16a34a' },
  
  // Grays & Others
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Zinc', value: '#71717a' },
  { name: 'Stone', value: '#78716c' }
]

function CreateCategoryModal({ isOpen, onClose, onSuccess }: CreateCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      setError('Category name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Check if category already exists
      const existingCategories = await db.getCategories()
      const categoryExists = existingCategories.some(
        cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      )

      if (categoryExists) {
        setError('Category with this name already exists')
        setIsLoading(false)
        return
      }

      // Create new category
      await db.addCategory({
        id: `category-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: categoryName.trim(),
        color: selectedColor.value,
        items: []
      })

      // Success
      onSuccess?.(categoryName.trim())
      onClose()
      
      // Reset form
      setCategoryName('')
      setSelectedColor(PRESET_COLORS[0])
      setError('')
    } catch (err) {
      console.error('Failed to create category:', err)
      setError('Failed to create category. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    } else if (event.key === 'Enter' && !isLoading) {
      handleCreate()
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      // Reset form after close animation
      setTimeout(() => {
        setCategoryName('')
        setSelectedColor(PRESET_COLORS[0])
        setError('')
      }, 300)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end"
          onClick={handleClose}
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
            className="w-full max-h-[70vh] bg-black/90 backdrop-blur-xl border-t border-white/20 rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="px-6 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Create New Category</h2>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Category name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Work, Personal, Important..."
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value)
                    if (error) setError('') // Clear error when user types
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all disabled:opacity-50"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </div>

              {/* Color Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-white mb-3">
                  Choose a color
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color)}
                      disabled={isLoading}
                      className={`
                        relative p-2 rounded-lg border-2 transition-all disabled:opacity-50 group
                        ${selectedColor.value === color.value 
                          ? 'border-white/60 bg-white/10 scale-105' 
                          : 'border-white/20 hover:border-white/40 hover:bg-white/5 hover:scale-105'
                        }
                      `}
                      title={color.name}
                    >
                      <div 
                        className="w-6 h-6 rounded-md mx-auto mb-1 shadow-sm"
                        style={{ backgroundColor: color.value }}
                      ></div>
                      <span className="text-xs text-white/80 truncate block">{color.name}</span>
                      
                      {selectedColor.value === color.value && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6 p-4 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
                <div className="text-sm text-gray-400 mb-3">Preview:</div>
                <div className="flex items-center justify-center">
                  <span 
                    className="px-3 py-1.5 text-sm rounded-full border text-white/90 flex items-center space-x-2"
                    style={{ 
                      backgroundColor: `${selectedColor.value}20`,
                      borderColor: `${selectedColor.value}60`
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedColor.value }}
                    ></div>
                    <span>{categoryName || 'Category name'}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isLoading || !categoryName.trim()}
                  className="flex-1 py-3 px-4 bg-green-500/20 text-green-300 border border-green-400/50 rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Category'
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

export default CreateCategoryModal