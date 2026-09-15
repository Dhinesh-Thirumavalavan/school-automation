import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ParentRoot from './parent/ParentRoot.tsx'
import DriverApp from './driver/DriverApp.tsx'

const path = window.location.pathname
const isParentApp = path.startsWith('/parent')
const isDriverApp = path.startsWith('/driver')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDriverApp ? <DriverApp /> : isParentApp ? <ParentRoot /> : <App />}
  </StrictMode>,
)
