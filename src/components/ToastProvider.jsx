import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../toast.js'

const DEFAULT_DURATION = 3500

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message, type, duration = DEFAULT_DURATION) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const success = useCallback((message, duration) => show(message, 'success', duration), [show])
  const error = useCallback((message, duration) => show(message, 'error', duration), [show])
  const info = useCallback((message, duration) => show(message, 'info', duration), [show])
  const value = useMemo(() => ({ success, error, info }), [success, error, info])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
