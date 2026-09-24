import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ToastProvider from './components/ToastProvider.jsx'
import { LocalizationProvider } from './i18n.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <LocalizationProvider>
        <App />
      </LocalizationProvider>
    </ToastProvider>
  </StrictMode>,
)

