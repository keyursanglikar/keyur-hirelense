// frontend/src/components/PrivateRoute.jsx

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, role } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to setup page if EmailJS or GDrive is not configured for first login
  if (user && role === 'firm_admin' && (user.email_settings_configured === false || user.gdrive_configured === false)) {
    return <Navigate to="/setup-email" replace />
  }
  if (user && role === 'super_admin' && user.email_settings_configured === false) {
    return <Navigate to="/setup-email" replace />
  }

  if (requiredRole && role !== requiredRole && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PrivateRoute