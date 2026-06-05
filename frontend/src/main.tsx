import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeContext'
import { AparenciaProvider } from './theme/AparenciaContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AparenciaProvider>
        <App />
      </AparenciaProvider>
    </ThemeProvider>
  </StrictMode>,
)
