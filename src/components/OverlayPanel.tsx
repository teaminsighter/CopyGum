import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardItem } from '../types/clipboard'
import { useClipboardStore } from '../hooks/useClipboardStore'
import { useModalManager } from '../hooks/useModalManager'
import { useCustomDetection } from '../hooks/useCustomDetection'
import { useSettings } from '../hooks/useSettings'
import ClipboardCard from './ClipboardCard'
import PanelHeader from './PanelHeader'
import CreateCategoryModal from './modals/CreateCategoryModal'
import SettingsModal from './modals/SettingsModal'
import ConfirmDeleteModal from './modals/ConfirmDeleteModal'
import { db } from '../services/database'

function OverlayPanel() {
  const [isVisible, setIsVisible] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [lastStorageWarning, setLastStorageWarning] = useState(0)
  const { settings } = useSettings()
  
  const {
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
    getAllCategories
  } = useClipboardStore()

  const {
    isOpen: isModalOpen,
    type: modalType,
    data: modalData,
    openCreateCategoryModal,
    openSettingsModal,
    openConfirmDeleteModal,
    closeModal
  } = useModalManager()

  // Automatically sync custom detection rules with main process
  useCustomDetection()

  // Check storage limit and show cleanup notification
  useEffect(() => {
    if (!settings.unlimitedStorage && items.length >= settings.maxItems) {
      const now = Date.now()
      
      // Only show warning once every 30 seconds to avoid spam
      if (now - lastStorageWarning < 30000) return
      
      setLastStorageWarning(now)
      
      const protectedItems = items.filter(item => 
        item.isPinned || (item.categories && item.categories.length > 0)
      ).length
      
      const deletableItems = items.length - protectedItems
      
      if (deletableItems > 0) {
        openConfirmDeleteModal(
          `Storage Full (${items.length}/${settings.maxItems})`,
          `Delete ${deletableItems} old items? Will keep ${protectedItems} pinned and customized items safe.`,
          async () => {
            await handleSmartCleanup()
          }
        )
      } else {
        setToast(`All ${items.length} items are protected (pinned/categorized). Increase storage limit in settings.`)
        setTimeout(() => setToast(null), 8000)
      }
    }
  }, [items.length, settings.maxItems, settings.unlimitedStorage, lastStorageWarning])

  // Load all categories
  const loadCategories = async () => {
    try {
      const categories = await getAllCategories()
      setAllCategories(categories)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  // Auto-expand search on typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if panel not visible, modal open, or special keys pressed
      if (!isVisible || isModalOpen || e.metaKey || e.ctrlKey || e.altKey) return
      
      // Skip if typing in an input field already
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return
      
      // Check if it's a searchable character (letters, numbers, space, common symbols)
      if (/^[a-zA-Z0-9\s.,!?@#$%^&*()_+\-=\[\]{};':"\\|<>/`~]$/.test(e.key)) {
        e.preventDefault() // Prevent default to avoid triggering other shortcuts
        setSearchQuery(e.key) // Start search with the typed character
        // The search will auto-expand in PanelHeader when searchQuery changes
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, isModalOpen, setSearchQuery])

  useEffect(() => {
    if (!window.electronAPI) return

    // Listen for panel show/hide events
    window.electronAPI.onShowPanel(() => {
      setIsVisible(true)
      // Use silent refresh after initial load to prevent flickering
      refreshItems(items.length > 0)
      loadCategories()
    })

    window.electronAPI.onHidePanel(() => {
      setIsVisible(false)
    })

    // Initial load
    refreshItems()
    loadCategories()

    // Cleanup listeners
    return () => {
      window.electronAPI.removeAllListeners('show-panel')
      window.electronAPI.removeAllListeners('hide-panel')
    }
  }, [refreshItems, getAllCategories])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return

      if (event.key === 'Escape') {
        window.electronAPI.hideOverlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  const handleCardClick = async (item: ClipboardItem) => {
    try {
      await copyItem(item)
      
      // Show toast
      setToast('Copied!')
      setTimeout(() => setToast(null), 1000)
      
      // Hide overlay after short delay
      setTimeout(async () => {
        await window.electronAPI.hideOverlay()
      }, 300)
    } catch (error) {
      console.error('Failed to copy item:', error)
      setToast('Failed to copy')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleDeleteAll = () => {
    openConfirmDeleteModal(
      'Clear all clipboard history?',
      'This will permanently delete all clipboard items.',
      async () => {
        try {
          await clearAll()
          setToast('All items deleted')
          setTimeout(() => setToast(null), 2000)
        } catch (error) {
          console.error('Failed to clear clipboard items:', error)
          setToast('Failed to clear items')
          setTimeout(() => setToast(null), 2000)
        }
      }
    )
  }

  const handleSmartCleanup = async () => {
    try {
      // Get items that can be safely deleted (not pinned, not categorized)
      const deletableItems = items.filter(item => 
        !item.isPinned && (!item.categories || item.categories.length === 0)
      )
      
      // Sort by timestamp (oldest first) and delete enough to get under limit
      const sortedDeletable = deletableItems.sort((a, b) => a.timestamp - b.timestamp)
      const targetCount = Math.max(settings.maxItems - 20, settings.maxItems * 0.8) // Clean up to 80% of limit
      const itemsToDelete = sortedDeletable.slice(0, Math.max(0, items.length - targetCount))
      
      console.log(`🧹 Smart cleanup: Deleting ${itemsToDelete.length} old items (keeping ${items.length - itemsToDelete.length} items)`)
      
      for (const item of itemsToDelete) {
        await db.deleteClipboardItem(item.id)
      }
      
      await refreshItems()
      
      const protectedCount = items.filter(item => 
        item.isPinned || (item.categories && item.categories.length > 0)
      ).length
      
      setToast(`✅ Deleted ${itemsToDelete.length} old items. Kept ${protectedCount} pinned/categorized items safe.`)
      setTimeout(() => setToast(null), 4000)
    } catch (error) {
      console.error('Smart cleanup failed:', error)
      setToast('❌ Cleanup failed. Please try again.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleRefresh = async () => {
    try {
      await refreshItems(false) // Always show loading for manual refresh
      setToast('Clipboard refreshed')
      setTimeout(() => setToast(null), 2000)
    } catch (error) {
      console.error('Failed to refresh clipboard:', error)
      setToast('Failed to refresh')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleOpenSettings = () => {
    openSettingsModal()
  }


  const handlePinItem = async (item: ClipboardItem) => {
    try {
      const updatedItem: ClipboardItem = {
        ...item,
        isPinned: !item.isPinned
      }

      await db.updateClipboardItem(updatedItem)
      await refreshItems()
      
      setToast(updatedItem.isPinned ? 'Item pinned' : 'Item unpinned')
      setTimeout(() => setToast(null), 2000)
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      setToast('Failed to update item')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleCreateCategory = () => {
    openCreateCategoryModal()
  }

  const handleCategoryCreated = (categoryName: string) => {
    setToast(`Category created: ${categoryName}`)
    setTimeout(() => setToast(null), 2000)
    refreshItems() // Refresh to update items
    loadCategories() // Refresh to update categories list
  }


  const handleCategoryRename = async (oldName: string, newName: string) => {
    try {
      // Update all items that have this category
      const itemsToUpdate = items.filter(item => 
        item.categories && item.categories.includes(oldName)
      )
      
      for (const item of itemsToUpdate) {
        const updatedCategories = item.categories?.map(cat => 
          cat === oldName ? newName : cat
        ) || []
        
        const updatedItem: ClipboardItem = {
          ...item,
          categories: updatedCategories
        }
        
        await db.updateClipboardItem(updatedItem)
      }
      
      // Update category in database if it exists as a custom category
      const categories = await db.getCategories()
      const categoryToUpdate = categories.find(cat => cat.name === oldName)
      if (categoryToUpdate) {
        const updatedCategory = {
          ...categoryToUpdate,
          name: newName
        }
        await db.deleteCategory(categoryToUpdate.id)
        await db.addCategory(updatedCategory)
      }
      
      setToast(`Category renamed to "${newName}"`)
      setTimeout(() => setToast(null), 2000)
      loadCategories() // Refresh categories list
      refreshItems() // Refresh items to update category names
    } catch (error) {
      console.error('Failed to rename category:', error)
      setToast('Failed to rename category')
      setTimeout(() => setToast(null), 2000)
    }
  }

  // Calculate drag constraints for Framer Motion
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 })
  
  useEffect(() => {
    if (filteredItems.length > 0) {
      const cardWidth = 288 + 12 // Card width (w-72 = 288px) + margin
      const containerWidth = window.innerWidth
      const totalWidth = filteredItems.length * cardWidth
      const maxScroll = Math.max(0, totalWidth - containerWidth + 48) // 48px padding
      
      setDragConstraints({
        left: -maxScroll,
        right: 0
      })
    }
  }, [filteredItems])

  return (
    <>
      <AnimatePresence>
        {isVisible && (
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
            className="fixed bottom-0 left-0 right-0 h-[480px] bg-black z-50"
          >
            <PanelHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={allCategories}
              onDeleteAll={handleDeleteAll}
              onRefresh={handleRefresh}
              onCreateCategory={handleCreateCategory}
              onOpenSettings={handleOpenSettings}
              itemCount={items.length}
              onCategoryRename={handleCategoryRename}
            />

            <div className="h-full pt-20 pb-6">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading clipboard items...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-red-400">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p>Error loading clipboard items</p>
                    <p className="text-sm text-red-300 mt-2">{error}</p>
                    <button 
                      onClick={() => refreshItems()}
                      className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-hidden">
                  {filteredItems.length > 0 ? (
                    <motion.div
                      drag="x"
                      dragElastic={0.2}
                      dragMomentum={true}
                      dragConstraints={dragConstraints}
                      className="flex h-full py-6 cursor-grab active:cursor-grabbing"
                      style={{ 
                        minWidth: 'max-content',
                        paddingLeft: '24px',
                        paddingRight: '24px'
                      }}
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
                      {filteredItems.map((item, index) => (
                        <div key={item.id} className="flex-shrink-0 mr-3">
                          <ClipboardCard
                            item={item}
                            onClick={() => handleCardClick(item)}
                            onPin={handlePinItem}
                            isFirst={index === 0}
                          />
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="text-center text-gray-400">
                        <div className="text-8xl mb-6">📋</div>
                        <p className="text-2xl mb-2 text-white">No clipboard items found</p>
                        <p className="text-lg opacity-75">
                          {searchQuery || selectedCategory !== 'all' 
                            ? 'Try adjusting your search or category filter'
                            : 'Copy something to get started'
                          }
                        </p>
                        {!searchQuery && selectedCategory === 'all' && (
                          <div className="mt-6 text-sm text-white/60">
                            <p>Press <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Ctrl+C</kbd> to copy something, then return here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-green-500/20 text-green-300 border border-green-400/50 rounded-xl backdrop-blur-lg"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      
      <CreateCategoryModal
        isOpen={isModalOpen && modalType === 'createCategory'}
        onClose={closeModal}
        onSuccess={handleCategoryCreated}
      />

      <SettingsModal
        isOpen={isModalOpen && modalType === 'settings'}
        onClose={closeModal}
      />

      <ConfirmDeleteModal
        isOpen={isModalOpen && modalType === 'confirmDelete'}
        onClose={closeModal}
        title={modalData?.title || ''}
        message={modalData?.message || ''}
        onConfirm={modalData?.onConfirm || (() => {})}
      />
    </>
  )
}

export default OverlayPanel