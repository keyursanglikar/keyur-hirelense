import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Helmet } from 'react-helmet-async'

import LoadingAnimation from './components/LoadingAnimation'
import Login from './auth/Login'
import SuperAdminDashboard from './superadmin/SuperAdminDashboard'
import FirmDashboard from './ca/FirmDashboard'
import StaffDashboard from './ca/StaffDashboard'
import PrivateRoute from './auth/PrivateRoute'
import DashboardLayout from './components/DashboardLayout'
import ActivateAccount from './components/ActivateAccount'
import EmailSettingsSetupPage from './components/EmailSettingsSetupPage'
import ModuleAccessGuard from './module-loader/ModuleAccessGuard'
import HirelensApp from '@hirelense/App.jsx'
import { getCurrentUser } from './redux/slices/authSlice'  // ← Make sure this import exists

import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (token) {
      dispatch(getCurrentUser())
    }
  }, [dispatch])

  const handleLoadingComplete = () => {
    setLoading(false)
  }

  if (loading) {
    return <LoadingAnimation onComplete={handleLoadingComplete} />
  }

  return (
    <div className="ca-saas-app">
      <Helmet defaultTitle="CA SaaS Platform" titleTemplate="%s | CA SaaS Platform">
        <meta name="description" content="Comprehensive SaaS Platform for CA Firms" />
      </Helmet>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/ca/activate" element={<ActivateAccount />} />
        <Route path="/setup-email" element={<EmailSettingsSetupPage />} />
        
        {/* Hirelens Candidate Portal (Public) */}
        <Route path="/candidate-portal/*" element={<HirelensApp />} />
        <Route path="/interview/*" element={<HirelensApp />} />
        <Route path="/candidate/*" element={<HirelensApp />} />

        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Super Admin Routes */}
        <Route
          path="/superadmin/*"
          element={
            <PrivateRoute requiredRole="super_admin">
              <DashboardLayout>
                <SuperAdminDashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        
        {/* Firm Admin Routes */}
        <Route
          path="/firm/*"
          element={
            <PrivateRoute requiredRole="firm_admin">
              <DashboardLayout>
                <FirmDashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        
        {/* Staff Routes */}
        <Route
          path="/staff/*"
          element={
            <PrivateRoute requiredRole="staff">
              <DashboardLayout>
                <StaffDashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        
        {/* Dynamic Unique Module Routes */}
        <Route path="/ca/modules/:module_slug" element={<ModuleAccessGuard />} />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

export default App