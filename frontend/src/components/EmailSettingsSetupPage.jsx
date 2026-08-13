// frontend/src/components/EmailSettingsSetupPage.jsx

import React from 'react'
import { Box, Container, Paper, Typography, Button } from '@mui/material'
import { ExitToApp, Shield } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { logoutUser, updateUser } from '../redux/slices/authSlice'
import EmailSettings from './EmailSettings'

const EmailSettingsSetupPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user && user.email_settings_configured !== false) {
    return <Navigate to={role === 'super_admin' ? '/superadmin/dashboard' : '/firm/dashboard'} replace />
  }

  const handleSuccess = () => {
    dispatch(updateUser({ email_settings_configured: true }))
    if (role === 'super_admin') {
      navigate('/superadmin/dashboard')
    } else {
      navigate('/firm/dashboard')
    }
  }

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login')
    })
  }

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f4f7f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield sx={{ color: '#2d6a4f', fontSize: '2rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1b4332' }}>
              NZSolution Onboarding
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            startIcon={<ExitToApp />} 
            onClick={handleLogout}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Logout
          </Button>
        </Box>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: '16px', 
            border: '1px solid #e2efe6', 
            backgroundColor: '#eef5f0', 
            mb: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1b4332', mb: 1 }}>
            🔑 First-Time Setup Required
          </Typography>
          <Typography variant="body2" sx={{ color: '#40916c' }}>
            Hello <strong>{user?.first_name || 'Admin'}</strong>. As this is your first login session, you must configure your EmailJS credentials to enable automated portal email dispatching.
          </Typography>
        </Paper>

        <EmailSettings 
          type={role === 'super_admin' ? 'system' : 'firm'} 
          onSaveSuccess={handleSuccess} 
        />
      </Container>
    </Box>
  )
}

export default EmailSettingsSetupPage
