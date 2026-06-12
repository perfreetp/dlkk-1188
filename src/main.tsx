import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { MeetingProvider } from './store/MeetingContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <MeetingProvider>
        <App />
      </MeetingProvider>
    </HashRouter>
  </React.StrictMode>
)
