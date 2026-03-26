import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CorporateForm from './pages/CorporateForm.jsx'
import Profile from './pages/Profile.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/form/:id" element={<CorporateForm />} />
        <Route path="/Profile/:id" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
