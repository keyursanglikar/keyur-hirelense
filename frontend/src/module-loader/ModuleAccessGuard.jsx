import React, { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import Lock from '@mui/icons-material/Lock'
import api from '../api'

// Dynamically import ALL routes.jsx files inside the root modules/ directory
const moduleRoutes = import.meta.glob('../../../modules/*/frontend/routes.jsx', { eager: true })
const hirelensRoutes = import.meta.glob('../../../modules/Hirelens/hirelense/frontend/src/App.jsx', { eager: true })

const moduleComponents = {}
for (const path in moduleRoutes) {
  // path will be something like '../../../modules/fee_estimation/frontend/routes.jsx'
  const folderName = path.split('/')[4] // index 4 because of ../../../modules/<name>
  moduleComponents[folderName.toLowerCase()] = moduleRoutes[path].default
}

for (const path in hirelensRoutes) {
  moduleComponents['hirelens'] = hirelensRoutes[path].default
}

const ModuleAccessGuard = () => {
  const { module_slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const verifyAccess = async () => {
      const token = sessionStorage.getItem('access_token')
      if (!token) {
        navigate(`/login?redirect=/ca/modules/${module_slug}`)
        return
      }

      try {
        const res = await api.get(`/firms/ca/modules/${module_slug}/access/`)
        setHasAccess(true)
      } catch (err) {
        setHasAccess(false)
        setErrorMsg(err.response?.data?.error || "Your subscription for this module has expired or you do not have permission to access it.")
      } finally {
        setLoading(false)
      }
    }

    verifyAccess()
  }, [module_slug, navigate])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8faf9' }}>
        <CircularProgress sx={{ color: '#2d6a4f' }} />
      </Box>
    )
  }

  if (!hasAccess) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8faf9', p: 4, textAlign: 'center' }}>
        <Lock sx={{ fontSize: 80, color: '#c0392b', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b4332', mb: 1 }}>Access Denied</Typography>
        <Typography variant="body1" sx={{ color: '#52796f', mb: 3, maxWidth: 500 }}>
          {errorMsg}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/firm/dashboard')} sx={{ backgroundColor: '#2d6a4f' }}>
          Return to Dashboard
        </Button>
      </Box>
    )
  }

  const ModuleComponent = moduleComponents[module_slug]

  if (!ModuleComponent) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', background: '#f8faf9', height: '100vh' }}>
        <Typography variant="h5" sx={{ mb: 1, mt: 10 }}>Module Frontend Not Found</Typography>
        <Typography variant="body1" color="textSecondary">
          The backend granted access, but the frontend component for "{module_slug}" is not registered in the monolithic router.
        </Typography>
      </Box>
    )
  }

  return <ModuleComponent />
}

export default ModuleAccessGuard
