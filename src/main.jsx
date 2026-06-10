import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'

inject() // Enables Vercel Analytics — tracks page views and visitors automatically

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
