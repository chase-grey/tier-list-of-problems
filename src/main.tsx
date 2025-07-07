import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App'

// Debug message to confirm this file is loading
console.log('main.tsx loaded - debugging blank screen issue')

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV;

// Create the app with or without StrictMode based on environment
const app = isDevelopment ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

createRoot(document.getElementById('root')!).render(app);
