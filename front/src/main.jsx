import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './style.css'
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
        <DndProvider backend={HTML5Backend}>
          <App />
        </DndProvider>
    </AuthProvider>
  </StrictMode>,
)
