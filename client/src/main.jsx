import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LocaleProvider } from './context/LocaleContext.jsx'
import { TeamProvider } from './context/TeamContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <TeamProvider>
        <App />
      </TeamProvider>
    </LocaleProvider>
  </StrictMode>,
)
