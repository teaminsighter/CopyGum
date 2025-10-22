import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardItem } from '../types/clipboard'
import { db } from '../services/database'
import AppIcon from './AppIcon'

interface ClipboardCardProps {
  item: ClipboardItem
  onClick: () => void
  onPin?: (item: ClipboardItem) => void
  isFirst?: boolean
}

function ClipboardCard({ item, onClick, onPin, isFirst }: ClipboardCardProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(item.categories || [])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null)
  const [buttonClicked, setButtonClicked] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Default categories
  const defaultCategories = [
    'Work', 'Personal', 'Important', 'Archive', 'Temporary', 
    'Development', 'Design', 'Meeting', 'Reference', 'Shopping'
  ]

  useEffect(() => {
    console.log('🎯 ClipboardCard mounted, loading categories...')
    console.log('🎯 Default categories:', defaultCategories)
    loadCategories()
  }, [])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
        setShowNewCategoryInput(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadCategories = async () => {
    try {
      console.log('🔧 Loading categories from database...')
      const categories = await db.getCategories()
      console.log('🔧 Categories from DB:', categories)
      
      // Merge default categories with custom ones from DB
      const allCategories = [...defaultCategories, ...categories.map(cat => cat.name)]
      const uniqueCategories = [...new Set(allCategories)]
      console.log('🔧 Unique categories:', uniqueCategories)
      setAvailableCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to load categories:', error)
      console.log('🔧 Using default categories as fallback')
      setAvailableCategories(defaultCategories)
    }
  }

  const handleCategoryToggle = (categoryName: string) => {
    const isSelected = selectedCategories.includes(categoryName)
    let updatedCategories: string[]
    
    if (isSelected) {
      // Remove category
      updatedCategories = selectedCategories.filter(cat => cat !== categoryName)
    } else {
      // Add category
      updatedCategories = [...selectedCategories, categoryName]
    }
    
    setSelectedCategories(updatedCategories)
    
    // Update the item in the database
    updateItemCategories(updatedCategories)
  }

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return
    
    try {
      // Add to database
      await db.addCategory({
        id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: newCategoryName.trim(),
        color: '#3B82F6', // Default blue color
        items: []
      })
      
      // Reload categories
      await loadCategories()
      
      // Add to current item
      const updatedCategories = [...selectedCategories, newCategoryName.trim()]
      setSelectedCategories(updatedCategories)
      updateItemCategories(updatedCategories)
      
      // Reset input
      setNewCategoryName('')
      setShowNewCategoryInput(false)
    } catch (error) {
      console.error('Failed to add new category:', error)
    }
  }

  const updateItemCategories = async (categories: string[]) => {
    try {
      const updatedItem: ClipboardItem = {
        ...item,
        categories
      }
      
      await db.updateClipboardItem(updatedItem)
      console.log('✅ Updated item categories:', categories)
    } catch (error) {
      console.error('Failed to update item categories:', error)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const renderContent = () => {
    const content = item.content

    // URL content
    if (item.type === 'url') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-blue-300 font-medium">🔗 URL</div>
          <div className="text-white break-all text-sm leading-relaxed">
            {content}
          </div>
        </div>
      )
    }

    // Email content
    if (item.type === 'email') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-green-300 font-medium">📧 Email</div>
          <div className="text-white break-all text-sm leading-relaxed">
            {content}
          </div>
        </div>
      )
    }

    // Image content
    if (item.type === 'image') {
      return (
        <div className="space-y-2 h-full">
          <div className="text-sm text-orange-300 font-medium">🖼️ Image</div>
          <div className="flex items-center justify-center h-32 rounded-lg overflow-hidden bg-orange-500">
            <img 
              src={content} 
              alt="Clipboard image" 
              className="max-w-full max-h-full object-contain"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
            />
          </div>
        </div>
      )
    }

    // Color content
    if (item.type === 'color') {
      
      return (
        <div className="space-y-3">
          <div className="text-sm font-medium text-white drop-shadow-lg bg-black/30 backdrop-blur-sm rounded px-2 py-1 inline-block">🎨 Color</div>
          <div className="flex items-center justify-center">
            <div className="font-mono text-lg font-bold text-white drop-shadow-lg bg-black/30 backdrop-blur-sm rounded px-3 py-2">
              {content.toUpperCase()}
            </div>
          </div>
        </div>
      )
    }

    // Code content
    if (item.type === 'code') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-purple-300 font-medium">💻 Code</div>
          <div className="text-white font-mono text-xs leading-relaxed bg-black/20 p-2 rounded border border-white/10 overflow-hidden">
            <div className="line-clamp-6">
              {content}
            </div>
          </div>
        </div>
      )
    }

    // Number content
    if (item.type === 'number') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-cyan-300 font-medium">🔢 Number</div>
          <div className="text-white font-mono text-lg">
            {content}
          </div>
        </div>
      )
    }

    // Password content
    if (item.type === 'password') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-red-300 font-medium">🔒 Password</div>
          <div className="text-white font-mono text-sm bg-red-900/20 p-2 rounded border border-red-500/30">
            {'•'.repeat(Math.min(content.length, 12))}
          </div>
        </div>
      )
    }

    // API content
    if (item.type === 'api') {
      return (
        <div className="space-y-2">
          <div className="text-sm text-indigo-300 font-medium">🔧 API</div>
          <div className="text-white font-mono text-xs leading-relaxed bg-black/20 p-2 rounded border border-white/10 overflow-hidden">
            <div className="line-clamp-4">
              {content}
            </div>
          </div>
        </div>
      )
    }

    // Default text content
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-300 font-medium">📝 Text</div>
        <div className="text-white text-sm leading-relaxed">
          <div className="line-clamp-6">
            {content}
          </div>
        </div>
      </div>
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      const target = e.target as HTMLElement
      // Check if the click is on a button or inside the dropdown
      const isButton = target.closest('button') || target.closest('[data-dropdown="true"]')
      
      if (!isButton) {
        setDragStartPos({ x: e.clientX, y: e.clientY })
        setIsDragging(false)
      } else {
        setButtonClicked(true)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartPos) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2)
      )
      
      if (distance > 5) { // Threshold for drag
        setIsDragging(true)
      }
    }
  }

  const handleMouseUp = () => {
    if (dragStartPos && !isDragging && !buttonClicked) {
      // This was a click, not a drag, and not on a button
      onClick()
    }
    setDragStartPos(null)
    setIsDragging(false)
    setButtonClicked(false) // Reset button click flag
  }

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if we're in the middle of a drag operation
    if (dragStartPos && isDragging) {
      e.preventDefault()
      setDragStartPos(null)
      setIsDragging(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative flex flex-col p-4 backdrop-blur-sm rounded-2xl border cursor-pointer group transition-all duration-200 w-72 h-80 hover:shadow-xl hover:border-white/40 ${
        isFirst ? 'ring-2 ring-blue-400/50' : ''
      } ${
        item.type === 'color' 
          ? 'border-white/30' 
          : item.type === 'image'
          ? 'bg-orange-500 border-orange-400/50'
          : 'bg-white/10 border-white/20'
      }`}
      style={item.type === 'color' ? { 
        backgroundColor: item.content,
        boxShadow: `0 4px 20px ${item.content}40`
      } : item.type === 'image' ? {
        boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)'
      } : {}}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Header with source app and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center space-x-2 ${
          item.type === 'color' ? 'bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1' : ''
        }`}>
          <AppIcon appName={item.source || 'System'} size={16} />
          <span className={`text-sm font-medium ${
            item.type === 'color' 
              ? 'text-white drop-shadow-lg'
              : 'text-white/80'
          }`}>
            {item.source || 'System'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative" ref={dropdownRef}>
            <button
              className={`p-1.5 rounded-md transition-all duration-200 z-50 relative shadow-sm cursor-pointer ${
                item.type === 'color' 
                  ? 'bg-black/40 hover:bg-black/60 text-white border border-white/50 backdrop-blur-sm' 
                  : 'bg-white/20 hover:bg-white/30 text-white/90 border border-white/30'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setButtonClicked(true) // Set immediately on mouse down
                console.log('🔧 Edit button mouse down!')
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setButtonClicked(true) // Mark that a button was clicked
                console.log('🔧 Edit button clicked!', { showCategoryDropdown })
                if (!showCategoryDropdown) {
                  console.log('🔧 Loading categories...')
                  loadCategories()
                }
                console.log('🔧 Toggling dropdown from', showCategoryDropdown, 'to', !showCategoryDropdown)
                setShowCategoryDropdown(!showCategoryDropdown)
              }}
              type="button"
              style={{ 
                pointerEvents: 'auto', 
                zIndex: 9999,
                position: 'relative'
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Category Dropdown */}
            {showCategoryDropdown && (
              console.log('🔧 Rendering dropdown with categories:', availableCategories),
              <div
                className="fixed top-16 left-1/2 transform -translate-x-1/2 w-72 bg-white rounded-lg p-3 z-[99999] border border-gray-300 shadow-2xl"
                style={{
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                }}
                data-dropdown="true"
                onClick={(e) => {
                  e.stopPropagation()
                  setButtonClicked(true) // Mark that a button/dropdown was clicked
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setButtonClicked(true) // Mark that a button/dropdown was clicked
                }}
                onFocus={(e) => e.stopPropagation()}
              >
                  {/* Header - Fixed */}
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-0.5">Categories</h3>
                      <p className="text-xs text-gray-500">Select categories</p>
                    </div>
                    <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {selectedCategories.length}
                    </div>
                  </div>
                  
                  {/* Scrollable Categories List */}
                  <div className="overflow-y-auto pr-1 h-48">
                    <div className="space-y-1.5">
                      {/* Show all available categories */}
                      {(availableCategories.length > 0 ? availableCategories : ['Work', 'Personal', 'Important', 'Archive', 'Development'])
                        .map((categoryName, index) => {
                        const isSelected = selectedCategories.includes(categoryName)
                        return (
                          <label
                            key={`${categoryName}-${index}`}
                            className={`group flex items-center space-x-2 p-2 rounded cursor-pointer transition-all duration-200 border ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setButtonClicked(true)
                            }}
                          >
                            <div className={`relative w-3.5 h-3.5 rounded border transition-all duration-200 ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'bg-white border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCategoryToggle(categoryName)}
                              className="sr-only"
                              onClick={(e) => {
                                e.stopPropagation()
                                setButtonClicked(true)
                              }}
                            />
                            <div className="flex-1">
                              <span className={`text-xs font-medium transition-colors duration-200 ${
                                isSelected ? 'text-blue-700' : 'text-gray-800'
                              }`}>
                                {categoryName}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="text-blue-500">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Add New Category - Fixed at Bottom */}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex-shrink-0 bg-white">
                    {showNewCategoryInput ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category..."
                          className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-all text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddNewCategory()
                            } else if (e.key === 'Escape') {
                              setShowNewCategoryInput(false)
                              setNewCategoryName('')
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setButtonClicked(true)
                              handleAddNewCategory()
                            }}
                            className="flex-1 px-2 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-all font-medium text-xs"
                          >
                            Add
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setButtonClicked(true)
                              setShowNewCategoryInput(false)
                              setNewCategoryName('')
                            }}
                            className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-all font-medium text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setButtonClicked(true)
                          setShowNewCategoryInput(true)
                        }}
                        className="flex items-center justify-center space-x-1.5 w-full p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded transition-all text-xs"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="font-medium">New Category</span>
                      </button>
                    )}
                  </div>
                </div>
            )}
          </div>

          <button
            className={`p-1.5 rounded-md transition-all duration-200 relative z-50 shadow-sm ${
              item.isPinned 
                ? (item.type === 'color' 
                   ? 'bg-yellow-500/50 text-yellow-100 border border-yellow-300 hover:bg-yellow-500/70 backdrop-blur-sm' 
                   : 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/70 hover:bg-yellow-500/40')
                : (item.type === 'color' 
                   ? 'bg-black/40 hover:bg-black/60 text-white border border-white/50 backdrop-blur-sm' 
                   : 'bg-white/20 hover:bg-white/30 text-white/90 border border-white/30')
            }`}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setButtonClicked(true) // Set immediately on mouse down
              console.log('📌 Pin button mouse down!')
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setButtonClicked(true) // Mark that a button was clicked
              console.log('📌 Pin button clicked!')
              onPin?.(item)
            }}
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            {item.isPinned ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,4V6H12V4H8V6H6V4H4V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V4H14M16,8V10H14V8H16M12,8V10H10V8H12M8,8V10H6V8H8M16,12V14H14V12H16M12,12V14H10V12H12M8,12V14H6V12H8M16,16V18H14V16H16M12,16V18H10V16H12M8,16V18H6V16H8Z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Time - Below app info */}
      <div className={`text-xs mb-4 ${
        item.type === 'color'
          ? 'text-white drop-shadow-lg bg-black/20 backdrop-blur-sm rounded px-2 py-1 inline-block'
          : 'text-white/60'
      }`}>
        {formatTimestamp(item.timestamp)}
      </div>

      {/* Main Content Area - Fixed height */}
      <div className="h-40 overflow-hidden mb-3">
        {renderContent()}
      </div>

      {/* Bottom Section - Fixed height at bottom */}
      <div className="h-12 flex flex-col justify-end space-y-1">
        {/* Selected Categories - Fixed height container */}
        <div className="h-6 overflow-hidden">
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {selectedCategories.slice(0, 3).map((categoryName) => (
                <span
                  key={categoryName}
                  className="px-1.5 py-0.5 text-xs rounded bg-white/20 text-white/80 border border-white/30"
                >
                  {categoryName}
                </span>
              ))}
              {selectedCategories.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-white/20 text-white/80 border border-white/30">
                  +{selectedCategories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Character Count */}
        <div className={`text-xs text-center h-4 ${
          item.type === 'color'
            ? 'text-white drop-shadow-lg bg-black/20 backdrop-blur-sm rounded px-2 py-0.5 inline-block'
            : 'text-white/40'
        }`}>
          {item.content.length} chars
        </div>
      </div>


      {/* Click Indicator */}
      <div className={`absolute bottom-2 right-3 text-xs ${
        item.type === 'color'
          ? 'text-white drop-shadow-lg bg-black/20 backdrop-blur-sm rounded px-2 py-0.5'
          : 'text-white/40'
      }`}>
        Click to copy
      </div>

    </motion.div>
  )
}

export default ClipboardCard