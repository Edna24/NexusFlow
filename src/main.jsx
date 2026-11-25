import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  testSupabaseConnection,
} from './services/supabase'
import './styles/global.css'

const configError = getSupabaseConfigError()
if (configError) {
  console.error(`[NexusFlow] ${configError}`)
} else if (import.meta.env.DEV) {
  testSupabaseConnection().then((result) => {
    if (result.ok) {
      console.info(`[NexusFlow] ${result.message}`)
    } else {
      console.error(`[NexusFlow] Supabase connection check failed: ${result.message}`)
    }
  })
}

if (!isSupabaseConfigured) {
  console.warn(
    '[NexusFlow] Running without a Supabase client. Authenticated data features are unavailable.',
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
