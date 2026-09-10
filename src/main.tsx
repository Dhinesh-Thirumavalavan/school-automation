import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ParentRoot from './parent/ParentRoot.tsx'

const isParentApp = window.location.pathname.startsWith('/parent')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isParentApp ? <ParentRoot /> : <App />}
  </StrictMode>,
)
