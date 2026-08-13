// frontend/src/components/PrivateRoute.jsx

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, role } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to setup page if EmailJS is not configured for first login
  if (user && user.email_settings_configured === false && (role === 'super_admin' || role === 'firm_admin')) {
    return <Navigate to="/setup-email" replace />
  }

  if (requiredRole && role !== requiredRole && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PrivateRoute