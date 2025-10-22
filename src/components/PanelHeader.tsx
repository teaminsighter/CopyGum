import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTypeIcon } from '../utils/appIcons'
import { db } from '../services/database'
import { useCategoryOrder } from '../hooks/useCategoryOrder'

interface PanelHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  categories: string[]
  onDeleteAll: () => void
  onRefresh: () => void
  onCreateCategory: () => void
  onOpenSettings: () => void
  itemCount: number
  onCategoryRename?: (oldName: string, newName: string) => void
}

function PanelHeader({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onDeleteAll,
  onRefresh,
  onCreateCategory,
  onOpenSettings,
  itemCount,
  onCategoryRename
}: PanelHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 })
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [colorRefreshKey, setColorRefreshKey] = useState(0)
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const { sortCategoriesByOrder, saveCategoryOrder } = useCategoryOrder()
  const renameInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Click outside to exit edit mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node) && editingCategory) {
        exitEditMode()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingCategory])

  // Load custom categories
  const loadCustomCategories = async () => {
    try {
      const dbCategories = await db.getCategories()
      setCustomCategories(dbCategories)
    } catch (error) {
      console.error('Failed to load custom categories:', error)
    }
  }

  // Listen for color changes from settings
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🎨 Category colors updated, refreshing panel header')
      setColorRefreshKey(prev => prev + 1)
      loadCustomCategories() // Reload custom categories when colors change
    }

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events from the same window
    window.addEventListener('categoryColorsUpdated', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('categoryColorsUpdated', handleStorageChange)
    }
  }, [])

  // Load custom categories on mount
  useEffect(() => {
    loadCustomCategories()
  }, [])

  // Auto-expand search when searchQuery is set programmatically
  useEffect(() => {
    if (searchQuery && !isSearchExpanded) {
      setIsSearchExpanded(true)
      // Focus the search input after expansion
      setTimeout(() => {
        searchInputRef.current?.focus()
        // Move cursor to end of text
        if (searchInputRef.current) {
          const input = searchInputRef.current
          input.setSelectionRange(input.value.length, input.value.length)
        }
      }, 100)
    }
  }, [searchQuery, isSearchExpanded])

  // Calculate drag constraints for categories
  useEffect(() => {
    const calculateConstraints = () => {
      const containerWidth = 1024 // max-w-4xl approximation
      const totalCategories = categories.length + 1 // +1 for "All Categories"
      const averageButtonWidth = 120 // approximate button width
      const leftPadding = 120 // padding-left
      const rightPadding = 24 // padding-right
      const totalWidth = totalCategories * averageButtonWidth + leftPadding + rightPadding
      const overflow = Math.max(0, totalWidth - containerWidth)
      
      setDragConstraints({
        left: -overflow, // Allow dragging left to show more categories
        right: 50 // Allow some right movement to show initial categories better
      })
    }

    calculateConstraints()
  }, [categories])

  // Enhanced category color function that checks both custom categories and localStorage
  const getCategoryColor = (category: string): string => {
    // First check if it's a custom category
    const customCategory = customCategories.find(cat => cat.name === category)
    if (customCategory && customCategory.color) {
      console.log('🎨 Found custom category color:', category, customCategory.color)
      return customCategory.color
    }

    // Fallback to localStorage for default categories
    const defaultColors = localStorage.getItem('clipflow-category-colors')
    if (defaultColors) {
      try {
        const colorMap = JSON.parse(defaultColors)
        if (colorMap[category]) {
          console.log('🎨 Found localStorage color:', category, colorMap[category])
          return colorMap[category]
        }
      } catch (error) {
        console.warn('Failed to parse clipflow-category-colors:', error)
      }
    }

    // Default color mapping
    const defaultColorMap: Record<string, string> = {
      text: '#10B981',
      code: '#8B5CF6', 
      color: '#F59E0B',
      url: '#3B82F6',
      email: '#EC4899',
      password: '#EF4444',
      number: '#06B6D4',
      api: '#6366F1',
      uuid: '#059669',
      ip: '#0EA5E9',
      mac: '#64748B',
      json: '#8B5CF6',
      jwt: '#F97316',
      'api-key': '#DC2626',
      sql: '#14B8A6',
      'credit-card': '#EAB308',
      phone: '#84CC16'
    }
    
    console.log('🎨 Using default color for:', category, defaultColorMap[category.toLowerCase()] || '#10B981')
    return defaultColorMap[category.toLowerCase()] || '#10B981'
  }

  // Convert hex color to CSS styles
  const getCategoryStyles = useMemo(() => {
    return (category: string) => {
      const color = getCategoryColor(category)
      
      // Convert hex to RGB for opacity
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null
      }
      
      const rgb = hexToRgb(color)
      if (!rgb) {
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          color: 'rgba(16, 185, 129, 0.9)',
          borderColor: 'rgba(16, 185, 129, 0.5)'
        }
      }
      
      return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
        borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
      }
    }
  }, [colorRefreshKey, customCategories])

  // Simple real count display
  const formatItemCount = (currentCount: number): string => {
    return `${currentCount} items`
  }

  const getCategoryLabel = (type: string): string => {
    const labels: Record<string, string> = {
      // 🟢 100% Accurate
      text: 'Text',
      email: 'Email',
      url: 'URL',
      color: 'Color',
      number: 'Number',
      uuid: 'UUID',
      ip: 'IP Address',
      mac: 'MAC Address',
      
      // 🟡 High Accuracy
      code: 'Code',
      json: 'JSON',
      jwt: 'JWT Token',
      'api-key': 'API Key',
      sql: 'SQL',
      
      // Legacy
      api: 'API',
      password: 'Password'
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Debug categories and editing state
  useEffect(() => {
    console.log('🏷️ Categories in PanelHeader:', categories)
  }, [categories])

  useEffect(() => {
    console.log('✏️ Editing category changed to:', editingCategory)
  }, [editingCategory])

  // Long press detection for single-category edit mode
  const handleCategoryMouseDown = (category: string) => {
    console.log('🖱️ Mouse down on category:', category)
    const timer = setTimeout(() => {
      console.log('⏰ Long press detected, entering edit mode for:', category)
      setEditingCategory(category)
      setLongPressTimer(null)
    }, 800) // 800ms long press
    setLongPressTimer(timer)
  }

  const handleCategoryMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleCategoryClick = (category: string) => {
    if (!editingCategory) {
      onCategoryChange(category)
    }
  }

  const exitEditMode = () => {
    setEditingCategory(null)
    setRenamingCategory(null)
    setRenameValue('')
    setDraggedCategory(null)
    setDragOverIndex(null)
  }

  const startRename = (category: string) => {
    setRenamingCategory(category)
    setRenameValue(category)
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 50)
  }

  const confirmRename = () => {
    if (renamingCategory && renameValue.trim() && renameValue.trim() !== renamingCategory) {
      onCategoryRename?.(renamingCategory, renameValue.trim())
    }
    setRenamingCategory(null)
    setRenameValue('')
  }

  // Drag functionality for category reordering
  const handleDragStart = (e: React.DragEvent, category: string) => {
    console.log('🚀 Drag started:', category)
    setDraggedCategory(category)
    
    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = 'rotate(5deg)'
    dragImage.style.opacity = '0.8'
    e.dataTransfer.setDragImage(dragImage, 50, 20)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', category) // Add data for compatibility
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    console.log('👆 Drag over index:', index)
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the entire container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const isInsideContainer = 
      e.clientX >= rect.left && 
      e.clientX <= rect.right && 
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
    
    if (!isInsideContainer) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    console.log('🔄 Drop triggered:', { draggedCategory, dropIndex })
    
    if (!draggedCategory) {
      console.log('❌ No dragged category')
      return
    }
    
    const sortedCategories = sortCategoriesByOrder(categories)
    const draggedIndex = sortedCategories.indexOf(draggedCategory)
    
    console.log('📊 Drop data:', { 
      sortedCategories, 
      draggedIndex, 
      dropIndex,
      draggedCategory 
    })
    
    if (draggedIndex === -1) {
      console.log('❌ Dragged category not found in sorted list')
      setDraggedCategory(null)
      setDragOverIndex(null)
      return
    }

    // Adjust drop index if dragging after the original position
    let adjustedDropIndex = dropIndex
    if (draggedIndex < dropIndex) {
      adjustedDropIndex = dropIndex - 1
    }

    if (draggedIndex === adjustedDropIndex) {
      console.log('⏭️ Same position, no change needed')
      setDraggedCategory(null)
      setDragOverIndex(null)
      return
    }

    // Create new order
    const newCategories = [...sortedCategories]
    const [removed] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(adjustedDropIndex, 0, removed)

    console.log('🔄 Reordered:', { original: sortedCategories, new: newCategories })

    // Save new order
    const newOrder: Record<string, number> = {}
    newCategories.forEach((cat, index) => {
      newOrder[cat] = index
    })
    
    console.log('💾 Saving new order:', newOrder)
    saveCategoryOrder(newOrder)
    
    // Reset drag state
    setDraggedCategory(null)
    setDragOverIndex(null)
    setEditingCategory(null)
  }

  const handleDragEnd = () => {
    // Reset drag state if drop didn't happen
    setTimeout(() => {
      setDraggedCategory(null)
      setDragOverIndex(null)
    }, 100)
  }

  return (
    <>
      {/* Main Header */}
      <div ref={headerRef} className="absolute top-0 left-0 right-0 h-20 bg-black/30 backdrop-blur-xl flex items-center px-6 z-10">
        {/* Left Section */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-400/30">
              <span className="text-orange-300 text-lg">📋</span>
            </div>
            <div>
              <span className="text-white font-semibold text-lg">ClipFlow</span>
              <div className="text-xs text-white/60">{formatItemCount(itemCount)}</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center">
            {isSearchExpanded ? (
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search clipboard items..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={() => {
                  if (!searchQuery) {
                    setIsSearchExpanded(false)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchExpanded(false)
                    onSearchChange('')
                  }
                }}
                className="w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-200"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  searchQuery ? 'bg-orange-500/20 text-orange-300' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Center Section - Categories */}
        <div className="flex-1 flex justify-start overflow-hidden">
          <motion.div 
            drag={editingCategory ? false : "x"}
            dragElastic={0.2}
            dragMomentum={true}
            dragConstraints={dragConstraints}
            className={`flex items-center space-x-3 ${editingCategory ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
            style={{ 
              minWidth: 'max-content',
              paddingLeft: '120px', // More padding to start categories more to the right
              paddingRight: '24px'
            }}
            initial={{ x: 0 }} // Start at position 0
            animate={{ x: 0 }}
            whileDrag={{ cursor: 'grabbing' }}
            dragTransition={{
              bounceStiffness: 300,
              bounceDamping: 40,
              power: 0.3,
              timeConstant: 750
            }}
            onDragStart={() => {
              if (window.electronAPI) {
                window.electronAPI.setDragState(true)
              }
            }}
            onDragEnd={() => {
              if (window.electronAPI) {
                window.electronAPI.setDragState(false)
              }
            }}
          >
            <button
              onClick={() => handleCategoryClick('all')}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50 shadow-lg'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              All Categories
            </button>
            
            {sortCategoriesByOrder(categories).map((category, index) => (
              <div 
                key={category} 
                className={`relative flex-shrink-0 transition-all duration-200 ${
                  dragOverIndex === index && draggedCategory && draggedCategory !== category 
                    ? 'ml-4' 
                    : ''
                }`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Drop zone indicator */}
                {dragOverIndex === index && draggedCategory && draggedCategory !== category && (
                  <div className="absolute -left-4 top-0 bottom-0 w-2 bg-green-400 rounded-full animate-pulse z-20 shadow-lg border-2 border-green-300" />
                )}
                
                {renamingCategory === category ? (
                  // Rename input
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename()
                      if (e.key === 'Escape') {
                        setRenamingCategory(null)
                        setRenameValue('')
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm bg-white/20 text-white border border-blue-400/50 focus:outline-none focus:border-blue-400"
                    style={{ width: `${Math.max(renameValue.length * 8 + 32, 80)}px` }}
                  />
                ) : (
                  // Regular category button
                  <button
                    draggable={editingCategory === category}
                    onDragStart={(e) => {
                      e.stopPropagation()
                      handleDragStart(e, category)
                    }}
                    onDragEnd={handleDragEnd}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      console.log('🔥 Button mouse down triggered!', category)
                      handleCategoryMouseDown(category)
                    }}
                    onMouseUp={handleCategoryMouseUp}
                    onMouseLeave={handleCategoryMouseUp}
                    onTouchStart={() => handleCategoryMouseDown(category)}
                    onTouchEnd={handleCategoryMouseUp}
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('🔥 Button clicked!', category)
                      handleCategoryClick(category)
                    }}
                    style={selectedCategory === category ? {
                      backgroundColor: 'rgba(59, 130, 246, 0.3)', // Keep blue for selected
                      color: 'rgba(191, 219, 254, 1)',
                      borderColor: 'rgba(96, 165, 250, 0.5)'
                    } : getCategoryStyles(category)}
                    className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 flex items-center space-x-2 relative border ${
                      selectedCategory === category
                        ? 'shadow-lg'
                        : 'hover:brightness-110'
                    } ${editingCategory === category ? 'animate-pulse ring-4 ring-blue-400' : ''} ${
                      draggedCategory === category ? 'opacity-70 scale-95 shadow-lg' : ''
                    } ${editingCategory === category ? 'cursor-move' : 'cursor-pointer'}`}
                  >
                    <span>{getTypeIcon(category)}</span>
                    <span>{getCategoryLabel(category)}</span>
                    
                    {/* Single-category edit mode overlay */}
                    {editingCategory === category && (
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(category)
                          }}
                          className="p-1.5 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-lg"
                          title="Rename"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* End drop zone */}
            {draggedCategory && (
              <div 
                className="relative flex-shrink-0"
                onDragOver={(e) => handleDragOver(e, categories.length)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, categories.length)}
              >
                {dragOverIndex === categories.length && (
                  <div className="w-2 h-8 bg-green-400 rounded-full animate-pulse shadow-lg border-2 border-green-300 ml-2" />
                )}
              </div>
            )}

          </motion.div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Single Category Edit Mode Controls */}
          {editingCategory ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center space-x-2"
              >
                <div className="text-sm text-white/80 bg-orange-500/20 px-3 py-1 rounded-lg border border-orange-400/30">
                  Editing: {getCategoryLabel(editingCategory)}
                </div>
                <button
                  onClick={exitEditMode}
                  className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 border border-green-400/50 hover:bg-green-500/30 transition-all duration-200 text-sm font-medium"
                >
                  Done
                </button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              {/* Add Category Button */}
              <button
                onClick={onCreateCategory}
                className="p-2.5 rounded-xl bg-green-500/20 text-green-300 border border-green-400/50 hover:bg-green-500/30 transition-all duration-200"
                title="Create new category"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </>
          )}
          
          <button
            onClick={onRefresh}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-300 hover:text-white"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={onDeleteAll}
            className="p-2.5 hover:bg-red-500/20 rounded-xl transition-all duration-200 text-red-400 hover:text-red-300"
            title="Clear All"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button
            onClick={onOpenSettings}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-300 hover:text-white"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

    </>
  )
}

export default PanelHeader