import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerServiceWorker } from './lib/install'
import { applyTheme, findTheme, loadThemeId } from './lib/theme'

// Paint the saved theme before the first frame, so the intro is in the right colours from the start.
applyTheme(findTheme(loadThemeId()))
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
