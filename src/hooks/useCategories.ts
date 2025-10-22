import { useState, useEffect, useCallback } from 'react'
import { db } from '../services/database'

export interface Category {
  id: string
  name: string
  color: string
  items: string[] // Array of item IDs
}

export const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16'  // Lime
]

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load categories from database
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const dbCategories = await db.getCategories()
      setCategories(dbCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
      console.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new category
  const createCategory = useCallback(async (name: string, color: string): Promise<Category | null> => {
    try {
      // Check for duplicate names
      if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Category already exists')
      }

      const newCategory: Category = {
        id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        color,
        items: []
      }

      await db.addCategory(newCategory)
      setCategories(prev => [...prev, newCategory])
      return newCategory
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
      console.error('Error creating category:', err)
      return null
    }
  }, [categories])

  // Update category
  const updateCategory = useCallback(async (id: string, updates: Partial<Category>): Promise<boolean> => {
    try {
      const categoryIndex = categories.findIndex(cat => cat.id === id)
      if (categoryIndex === -1) {
        throw new Error('Category not found')
      }

      const updatedCategory = { ...categories[categoryIndex], ...updates }
      await db.updateCategory(updatedCategory)
      
      setCategories(prev => 
        prev.map(cat => cat.id === id ? updatedCategory : cat)
      )
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
      console.error('Error updating category:', err)
      return false
    }
  }, [categories])

  // Delete category
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      await db.deleteCategory(id)
      setCategories(prev => prev.filter(cat => cat.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
      console.error('Error deleting category:', err)
      return false
    }
  }, [])

  // Get category by name
  const getCategoryByName = useCallback((name: string): Category | undefined => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase())
  }, [categories])

  // Get categories for dropdown/selection
  const getCategoryNames = useCallback((): string[] => {
    return categories.map(cat => cat.name).sort()
  }, [categories])

  // Assign item to category
  const assignItemToCategory = useCallback(async (itemId: string, categoryName: string): Promise<boolean> => {
    try {
      const category = getCategoryByName(categoryName)
      if (!category) {
        throw new Error('Category not found')
      }

      if (!category.items.includes(itemId)) {
        const updatedItems = [...category.items, itemId]
        return await updateCategory(category.id, { items: updatedItems })
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign item to category')
      console.error('Error assigning item to category:', err)
      return false
    }
  }, [getCategoryByName, updateCategory])

  // Remove item from category
  const removeItemFromCategory = useCallback(async (itemId: string, categoryName: string): Promise<boolean> => {
    try {
      const category = getCategoryByName(categoryName)
      if (!category) {
        throw new Error('Category not found')
      }

      const updatedItems = category.items.filter(id => id !== itemId)
      return await updateCategory(category.id, { items: updatedItems })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from category')
      console.error('Error removing item from category:', err)
      return false
    }
  }, [getCategoryByName, updateCategory])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return {
    categories,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryByName,
    getCategoryNames,
    assignItemToCategory,
    removeItemFromCategory
  }
}