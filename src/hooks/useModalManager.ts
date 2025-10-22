import { useState } from 'react'
import { ClipboardItem } from '../types/clipboard'

interface ModalState {
  isOpen: boolean
  type: string | null
  data: any
}

export function useModalManager() {
  const [state, setState] = useState<ModalState>({
    isOpen: false,
    type: null,
    data: null
  })

  const openEditCategoryModal = (item: ClipboardItem) => {
    setState({
      isOpen: true,
      type: 'editCategory',
      data: { item }
    })
  }

  const openCreateCategoryModal = () => {
    setState({
      isOpen: true,
      type: 'createCategory',
      data: null
    })
  }

  const openSettingsModal = () => {
    setState({
      isOpen: true,
      type: 'settings',
      data: null
    })
  }

  const openConfirmDeleteModal = (title: string, message: string, onConfirm: () => void) => {
    setState({
      isOpen: true,
      type: 'confirmDelete',
      data: { title, message, onConfirm }
    })
  }

  const closeModal = () => {
    setState({
      isOpen: false,
      type: null,
      data: null
    })
  }

  return {
    ...state,
    openEditCategoryModal,
    openCreateCategoryModal,
    openSettingsModal,
    openConfirmDeleteModal,
    closeModal
  }
}