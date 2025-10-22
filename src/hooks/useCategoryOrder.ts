import { useState, useEffect } from 'react'

export function useCategoryOrder() {
  const [categoryOrder, setCategoryOrder] = useState<Record<string, number>>({})

  useEffect(() => {
    // Load category order from localStorage
    try {
      const saved = localStorage.getItem('clipflow-category-order')
      if (saved) {
        setCategoryOrder(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load category order:', error)
    }
  }, [])

  const saveCategoryOrder = (order: Record<string, number>) => {
    try {
      localStorage.setItem('clipflow-category-order', JSON.stringify(order))
      setCategoryOrder(order)
    } catch (error) {
      console.error('Failed to save category order:', error)
    }
  }

  const sortCategoriesByOrder = (categories: string[]): string[] => {
    if (Object.keys(categoryOrder).length === 0) {
      // No custom order, return original
      return categories
    }

    return [...categories].sort((a, b) => {
      const orderA = categoryOrder[a] || 999
      const orderB = categoryOrder[b] || 999
      return orderA - orderB
    })
  }

  return {
    categoryOrder,
    saveCategoryOrder,
    sortCategoriesByOrder
  }
}