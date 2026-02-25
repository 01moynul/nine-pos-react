import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// 1. Import the new LanguageProvider
import { LanguageProvider } from './context/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Wrap the App component */}
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)