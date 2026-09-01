import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CorporateForm from './pages/CorporateForm.jsx'
import BreakoutPage from './pages/BreakoutPage.jsx'
import BreakoutBroadcast from './pages/BreakoutBroadcast.jsx'
import Profile from './pages/Profile.jsx'
import ReservedBooking from './pages/ReservedBooking.jsx'
import QrBroadcast from './pages/QrBroadcast.jsx'
import BulkInviteGenerator from './pages/BulkInviteGenerator.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/form/:id" element={<CorporateForm />} />
        <Route path="/breakout" element={<BreakoutPage />} />
        <Route path="/bo-broadcast" element={<BreakoutBroadcast />} />
        <Route path="/Profile/:id" element={<Profile />} />
        {/* <Route path="/reserved" element={<ReservedBooking />} /> */}
        {/* <Route path="/qr-broadcast" element={<QrBroadcast />} /> */}
        {/* <Route path="/bulk-invite" element={<BulkInviteGenerator />} /> */}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
