import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Use our simplified app that works with the installed dependencies
import MinimalApp from './MinimalApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MinimalApp />
  </StrictMode>,
)
