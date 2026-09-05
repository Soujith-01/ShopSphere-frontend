import { createContext, useContext } from 'react'

// Global toast API, provided by <ToastProvider/>. Components call
// useToast().success('…') / .error('…') / .info('…') for feedback.
export const ToastContext = createContext(null)

export const useToast = () => useContext(ToastContext)
