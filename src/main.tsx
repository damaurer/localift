import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './notifications'

requestPersistentStorage();

// When the service worker takes control for the very first time (no previous
// controller), reload so the navigation response goes through the SW and the
// COOP/COEP headers are applied to the document.
if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
