import { useState, useEffect } from 'react'
import { db } from '../../services/database'
import { getTypeIcon } from '../../utils/appIcons'

interface Category {
  id: string
  name: string
  color: string
  order: number
}

interface CategoryCustomizationProps {
  onCategoryOrderChange?: (categories: Category[]) => void
}

function CategoryCustomization({ onCategoryOrderChange }: CategoryCustomizationProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [draggedItem, setDraggedItem] = useState<Category | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Default categories with order
  const defaultCategories = [
    { name: 'text', order: 1 },
    { name: 'code', order: 2 },
    { name: 'url', order: 3 },
    { name: 'email', order: 4 },
    { name: 'number', order: 5 },
    { name: 'color', order: 6 },
    { name: 'password', order: 7 },
    { name: 'api', order: 8 }
  ]

  useEffect(() => {
    loadCategories()
  }, [])

  // Global mouse up handler to reset drag state if mouse is released outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        console.log('🏁 Global mouse up - resetting drag state')
        setDraggedItem(null)
        setDragStartIndex(null)
        setIsDragging(false)
        setDragOverIndex(null)
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging])

  const loadCategories = async () => {
    try {
      setLoading(true)
      
      // Get custom categories
      const customCategories = await db.getCategories()
      
      // Combine default and custom categories
      const allCategories: Category[] = [
        // Default categories (always present)
        ...defaultCategories.map(cat => ({
          id: `default-${cat.name}`,
          name: cat.name,
          color: getTypeColor(cat.name),
          order: cat.order
        })),
        // Custom categories
        ...customCategories.map((cat, index) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color || '#3B82F6',
          order: defaultCategories.length + index + 1
        }))
      ]

      // Sort by order
      allCategories.sort((a, b) => a.order - b.order)
      setCategories(allCategories)
      
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string): string => {
    // Load saved colors from localStorage
    const savedColors = JSON.parse(localStorage.getItem('clipflow-category-colors') || '{}')
    if (savedColors[type]) {
      return savedColors[type]
    }

    // Default colors
    const colors: Record<string, string> = {
      text: '#10B981',
      code: '#8B5CF6',
      color: '#F59E0B',
      url: '#3B82F6',
      email: '#EC4899',
      password: '#EF4444',
      number: '#06B6D4',
      api: '#6366F1'
    }
    return colors[type] || '#6B7280'
  }

  const getCategoryLabel = (name: string): string => {
    const labels: Record<string, string> = {
      text: 'Text',
      code: 'Code',
      color: 'Color',
      url: 'URL',
      email: 'Email',
      password: 'Password',
      number: 'Number',
      api: 'API'
    }
    return labels[name] || name.charAt(0).toUpperCase() + name.slice(1)
  }

  // Predefined color palette
  const colorPalette = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#64748B', '#6B7280', '#374151'
  ]

  const handleStartColorEdit = (category: Category) => {
    setColorPickerId(category.id)
    setSelectedColor(category.color)
  }

  const handleColorChange = async (color: string) => {
    if (!colorPickerId) return

    try {
      const category = categories.find(c => c.id === colorPickerId)
      if (!category) return

      // Update in database for custom categories
      if (!category.id.startsWith('default-')) {
        await db.updateCategory({
          id: category.id,
          name: category.name,
          color: color,
          items: []
        })
      }

      // Update local state
      setCategories(prev => prev.map(c => 
        c.id === colorPickerId 
          ? { ...c, color: color }
          : c
      ))

      // For default categories, save to localStorage for persistence
      if (category.id.startsWith('default-')) {
        const savedColors = JSON.parse(localStorage.getItem('clipflow-category-colors') || '{}')
        savedColors[category.name] = color
        localStorage.setItem('clipflow-category-colors', JSON.stringify(savedColors))
        console.log('🎨 Saved color for default category:', category.name, 'color:', color, 'all colors:', savedColors)
      } else {
        console.log('🎨 Saved color for custom category:', category.name, 'color:', color)
      }

      // Dispatch custom event to notify other components about color changes
      console.log('🎨 Dispatching categoryColorsUpdated event')
      window.dispatchEvent(new CustomEvent('categoryColorsUpdated'))

      setSelectedColor(color)
    } catch (error) {
      console.error('Failed to update category color:', error)
    }
  }

  const handleCancelColorEdit = () => {
    setColorPickerId(null)
    setSelectedColor('')
  }

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    try {
      const category = categories.find(c => c.id === editingId)
      if (!category) return

      // Only allow editing custom categories
      if (category.id.startsWith('default-')) {
        alert('Default categories cannot be renamed')
        setEditingId(null)
        return
      }

      // Update in database
      await db.updateCategory({
        id: category.id,
        name: editName.trim(),
        color: category.color,
        items: []
      })

      // Update local state
      setCategories(prev => prev.map(c => 
        c.id === editingId 
          ? { ...c, name: editName.trim() }
          : c
      ))

      setEditingId(null)
      setEditName('')
    } catch (error) {
      console.error('Failed to update category:', error)
      alert('Failed to update category')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleDeleteCategory = async (category: Category) => {
    if (category.id.startsWith('default-')) {
      alert('Default categories cannot be deleted')
      return
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return
    }

    try {
      await db.deleteCategory(category.id)
      setCategories(prev => prev.filter(c => c.id !== category.id))
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category')
    }
  }

  // Drag and drop handler


  const handleDrop = async (e: React.DragEvent | React.MouseEvent, dropIndex: number) => {
    e.preventDefault()
    console.log('🔄 handleDrop called - dropIndex:', dropIndex, 'draggedItem:', draggedItem?.name)
    
    if (!draggedItem) {
      console.log('❌ No draggedItem found')
      return
    }

    const dragIndex = categories.findIndex(c => c.id === draggedItem.id)
    console.log('🔄 dragIndex:', dragIndex, 'dropIndex:', dropIndex)
    
    if (dragIndex === dropIndex) {
      console.log('⚠️ Same position, no change needed')
      return
    }

    console.log('✅ Reordering from', dragIndex, 'to', dropIndex)

    // Reorder categories
    const newCategories = [...categories]
    const [removed] = newCategories.splice(dragIndex, 1)
    newCategories.splice(dropIndex, 0, removed)

    // Update order values
    const updatedCategories = newCategories.map((cat, index) => ({
      ...cat,
      order: index + 1
    }))

    console.log('📋 New order:', updatedCategories.map(c => `${c.order}:${c.name}`))

    setCategories(updatedCategories)
    setDraggedItem(null)
    setDragOverIndex(null)

    // Notify parent component
    onCategoryOrderChange?.(updatedCategories)

    // Save order to localStorage for persistence
    try {
      const orderMap = updatedCategories.reduce((acc, cat) => {
        acc[cat.name] = cat.order
        return acc
      }, {} as Record<string, number>)
      
      localStorage.setItem('clipflow-category-order', JSON.stringify(orderMap))
      console.log('💾 Saved order to localStorage')
    } catch (error) {
      console.error('Failed to save category order:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Category Management</h3>
        <p className="text-sm text-gray-400">
          6-column grid with serial ordering (1,2,3,4,5,6 → 7,8,9...) • Drag to reorder • Numbers show position
        </p>
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-400/30 rounded text-xs text-blue-200">
          💡 <strong>Mouse Drag:</strong> Click DOWN on one category → Move mouse to another category → Release UP. Watch console!
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 max-h-80 overflow-y-auto pr-1">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`relative p-1.5 rounded border cursor-grab select-none min-h-[80px] flex flex-col transition-all duration-200 ${
              dragOverIndex === index 
                ? 'border-blue-400 bg-blue-500/30 ring-2 ring-blue-400/50 scale-105' 
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/40'
            } ${draggedItem?.id === category.id ? 'opacity-50 scale-95' : ''}`}
            onMouseDown={(e) => {
              if (editingId === category.id || e.button !== 0) return // Only left mouse button
              
              console.log('🔄 Mouse down on:', category.name, 'at index:', index)
              setDraggedItem(category)
              setDragStartIndex(index)
              setIsDragging(true)
              e.currentTarget.style.cursor = 'grabbing'
              
              // Prevent text selection during drag
              e.preventDefault()
            }}
            onMouseEnter={() => {
              if (isDragging && draggedItem && draggedItem.id !== category.id) {
                console.log('🎯 Mouse enter on drop target:', category.name, 'at index:', index)
                setDragOverIndex(index)
              }
            }}
            onMouseLeave={() => {
              if (dragOverIndex === index) {
                setDragOverIndex(null)
              }
            }}
            onMouseUp={(e) => {
              if (isDragging && draggedItem) {
                console.log('📥 Mouse up on:', category.name, 'at index:', index)
                
                if (draggedItem.id !== category.id && dragStartIndex !== index) {
                  console.log('✅ Valid drop - reordering from', dragStartIndex, 'to', index)
                  handleDrop(e, index)
                } else {
                  console.log('⚠️ Same position or same item - no reorder')
                }
                
                // Reset drag state
                setDraggedItem(null)
                setDragStartIndex(null)
                setIsDragging(false)
                setDragOverIndex(null)
                e.currentTarget.style.cursor = 'grab'
              }
            }}
          >
            {/* Order number - top left */}
            <div className="absolute top-0.5 left-0.5 bg-blue-500/20 text-blue-300 text-xs font-mono px-1 rounded leading-none h-4 flex items-center">
              {index + 1}
            </div>

            {/* Default badge - top right */}
            {category.id.startsWith('default-') && (
              <div className="absolute top-0.5 right-0.5">
                <div className="bg-gray-500/20 text-gray-400 text-xs px-1 rounded leading-none h-4 flex items-center">
                  D
                </div>
              </div>
            )}

            {/* Drag handle - center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 opacity-50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM6 7a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zM6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zM6 13a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"></path>
              </svg>
            </div>

            {/* Category icon and name */}
            <div className="flex-1 flex flex-col items-center justify-center mt-4 mb-2">
              <div style={{ color: category.color }} className="text-lg mb-1">
                {getTypeIcon(category.name)}
              </div>
              
              {editingId === category.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  className="w-full px-1 py-0.5 bg-white/20 border border-white/30 rounded text-white text-xs text-center focus:outline-none focus:border-blue-400"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="text-white font-medium text-xs text-center leading-tight">
                  {getCategoryLabel(category.name)}
                </div>
              )}
            </div>

            {/* Action buttons - bottom */}
            <div className="flex justify-center space-x-0.5 mt-auto" onMouseDown={(e) => e.stopPropagation()}>
              {editingId === category.id ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleSaveEdit()
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    className="w-6 h-6 bg-green-500/20 text-green-300 text-xs rounded hover:bg-green-500/30 flex items-center justify-center"
                    draggable={false}
                  >
                    ✓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleCancelEdit()
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    className="w-6 h-6 bg-gray-500/20 text-gray-300 text-xs rounded hover:bg-gray-500/30 flex items-center justify-center"
                    draggable={false}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  {/* Color picker button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleStartColorEdit(category)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center border border-white/20 hover:border-white/40 transition-colors"
                    style={{ backgroundColor: category.color }}
                    draggable={false}
                    title="Change color"
                  >
                    <span className="text-white text-xs font-bold" style={{ 
                      textShadow: '0 0 2px rgba(0,0,0,0.8)',
                      filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))'
                    }}>
                      🎨
                    </span>
                  </button>

                  {/* Edit button (only for custom categories) */}
                  {!category.id.startsWith('default-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleStartEdit(category)
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      className="w-6 h-6 text-xs rounded flex items-center justify-center bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                      draggable={false}
                      title="Edit name"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Delete button (only for custom categories) */}
                  {!category.id.startsWith('default-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDeleteCategory(category)
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      className="w-6 h-6 bg-red-500/20 text-red-300 text-xs rounded hover:bg-red-500/30 flex items-center justify-center"
                      draggable={false}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Color Picker Modal */}
      {colorPickerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
             onClick={handleCancelColorEdit}>
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-sm w-full mx-4"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Choose Color</h3>
            
            {/* Color Palette */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    selectedColor === color 
                      ? 'border-white ring-2 ring-blue-400' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Color (Hex)
              </label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder="#3B82F6"
                className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelColorEdit}
                className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleColorChange(selectedColor)
                  setColorPickerId(null)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-2">
        <strong>6-Column Grid Layout:</strong>
        <ul className="mt-1 space-y-0.5 ml-3 text-xs">
          <li>• Numbers show order: 1,2,3,4,5,6 (row 1) → 7,8,9... (row 2)</li>
          <li>• Drag & drop any category to reorder instantly</li>
          <li>• "D" = Default (system types, cannot edit/delete)</li>
          <li>• 🎨 Change color • ✏️ Edit custom categories • 🗑️ Delete custom categories</li>
        </ul>
      </div>
    </div>
  )
}

export default CategoryCustomization