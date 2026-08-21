import React, { useState, useEffect } from 'react'
import { Box, Container, Paper, Typography, Button, CircularProgress } from '@mui/material'
import { ExitToApp, Shield, CheckCircleOutline } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { logoutUser, updateUser } from '../redux/slices/authSlice'
import EmailSettings from './EmailSettings'
import GDriveSettings from './GDriveSettings'
import api from '../api'

const EmailSettingsSetupPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useSelector((state) => state.auth)
  const [checkingGDrive, setCheckingGDrive] = useState(true)
  const [gdriveConfigured, setGdriveConfigured] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: EmailJS, 2: GDrive

  useEffect(() => {
    if (isAuthenticated && role !== 'super_admin') {
      checkGDriveStatus()
    } else {
      setCheckingGDrive(false)
    }
  }, [isAuthenticated, role])

  const checkGDriveStatus = async () => {
    try {
      const res = await api.get('/firms/gdrive-settings/')
      if (res.data && res.data.folder_id && res.data.service_account_json) {
        setGdriveConfigured(true)
      }
    } catch (e) {
      console.error('Error checking gdrive:', e)
    } finally {
      setCheckingGDrive(false)
    }
  }

  useEffect(() => {
    if (!checkingGDrive) {
      if (user?.email_settings_configured === false) {
        setCurrentStep(1)
      } else if (!gdriveConfigured && role !== 'super_admin') {
        setCurrentStep(2)
      }
    }
  }, [user, gdriveConfigured, checkingGDrive, role])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If both are done (or if super_admin and email is done), redirect
  if (!checkingGDrive && user?.email_settings_configured !== false) {
    if (role === 'super_admin' || gdriveConfigured) {
      return <Navigate to={role === 'super_admin' ? '/superadmin/dashboard' : '/firm/dashboard'} replace />
    }
  }

  const handleEmailSuccess = () => {
    dispatch(updateUser({ email_settings_configured: true }))
    if (role === 'super_admin') {
      navigate('/superadmin/dashboard')
    } else {
      setCurrentStep(2)
    }
  }

  const handleGDriveSuccess = () => {
    setGdriveConfigured(true)
    navigate('/firm/dashboard')
  }

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login')
    })
  }

  if (checkingGDrive) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
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
      <Container maxWidth="md">
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
            {currentStep === 1 ? "Step 1: Email Configuration" : "Step 2: Google Drive Configuration"}
          </Typography>
          <Typography variant="body2" sx={{ color: '#40916c' }}>
            Hello <strong>{user?.first_name || 'Admin'}</strong>. As this is your first login session, you must configure essential services before accessing the dashboard.
          </Typography>
        </Paper>

        {currentStep === 1 ? (
          <EmailSettings 
            type={role === 'super_admin' ? 'system' : 'firm'} 
            onSaveSuccess={handleEmailSuccess} 
          />
        ) : (
          <GDriveSettings 
            onSaveSuccess={handleGDriveSuccess} 
            onSkip={() => navigate('/firm/dashboard')} 
          />
        )}
      </Container>
    </Box>
  )
}

export default EmailSettingsSetupPage
