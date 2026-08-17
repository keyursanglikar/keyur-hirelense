// frontend/src/components/FirmDashboard.jsx

import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Button,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Warning,
  HourglassEmpty,
  CheckCircleOutlined,
  CloudQueue,
  People,
  Layers,
  Launch,
  InfoOutlined,
  Lock
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import api from '../api'
import EmailSettings from "../components/EmailSettings";
import './FirmDashboard.css'

const FirmModulesList = ({
  user,
  modules,
  loading,
  firmName,
  accessError,
  errorDialogOpen,
  setErrorDialogOpen,
  handleOpenModule,
  isModulePage = false
}) => {
  // Statistics calculations
  const totalCount = modules.length
  const activeCount = modules.filter(m => m.is_accessible).length
  const expiredCount = modules.filter(m => !m.is_accessible).length
  
  // Filter expiring soon modules under 30 days
  const expiringSoon = modules.filter(m => m.is_accessible && m.days_remaining <= 30)

  // Sub-badge helper
  const getDaysLeftColorClass = (days) => {
    if (days <= 7) return 'red-alert'
    if (days <= 15) return 'orange-alert'
    return 'yellow-alert'
  }

  if (loading) {
    return <Box className="spinner-container"><CircularProgress color="success" /></Box>
  }

  return (
    <>
      <Helmet>
        <title>{isModulePage ? 'Hirelens Module' : 'CA Dashboard'}</title>
      </Helmet>

      <Box className="firm-dashboard-content">
        {!isModulePage && (
          <>
            {/* Welcome Block */}
            <Box className="dashboard-welcome" sx={{ mb: 3 }}>
              <div>
                <Typography variant="h5" className="welcome-title">
                  Welcome, {user?.first_name || 'Firm'} {user?.last_name || 'Partner'}
                </Typography>
                <Typography variant="body2" className="welcome-subtitle">
                  CA Firm Administration Hub • <strong>{firmName}</strong>
                </Typography>
              </div>
              <Chip label="Firm Admin" className="role-badge-firm" />
            </Box>

            {/* Expiry Alert Warning Banner */}
            {expiringSoon.length > 0 && (
              <Alert 
                severity="warning" 
                icon={<Warning fontSize="inherit" />}
                className="expiring-banner-alert"
                sx={{ mb: 4 }}
              >
                <AlertTitle className="alert-title-text">Subscription Licensing Warnings ({expiringSoon.length})</AlertTitle>
                The following modules are expiring soon. Please contact SuperAdmin to renew subscriptions:
                <ul className="alert-list">
                  {expiringSoon.map(m => (
                    <li key={m.id}>
                      <strong>{m.module_name}</strong> expires in <strong>{m.days_remaining} days</strong> ({m.expiry_date})
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Metrics Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Active Modules */}
              <Grid item xs={12} sm={6} md={3}>
                <Card className="metric-card card-modules">
                  <CardContent className="metric-card-content">
                    <div className="card-header-box">
                      <div className="icon-wrapper bg-emerald-light">
                        <Layers className="icon-main text-emerald" />
                      </div>
                      <span className="summary-pill modules-pill">{activeCount}/{totalCount} Active</span>
                    </div>
                    <Typography className="metric-label">Allocated Modules</Typography>
                    <Typography className="metric-value">{activeCount}</Typography>
                    <Typography className="metric-subtext">{expiredCount} modules expired/inactive</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Staff Members Count */}
              <Grid item xs={12} sm={6} md={3}>
                <Card className="metric-card card-staff">
                  <CardContent className="metric-card-content">
                    <div className="card-header-box">
                      <div className="icon-wrapper bg-mint-light">
                        <People className="icon-main text-mint" />
                      </div>
                      <span className="summary-pill staff-pill">8 Seats Active</span>
                    </div>
                    <Typography className="metric-label">Staff Members</Typography>
                    <Typography className="metric-value">8</Typography>
                    <Typography className="metric-subtext">Manage CA office access controls</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Storage Used */}
              <Grid item xs={12} sm={6} md={3}>
                <Card className="metric-card card-storage">
                  <CardContent className="metric-card-content">
                    <div className="card-header-box">
                      <div className="icon-wrapper bg-emerald-light">
                    <CloudQueue className="icon-main text-emerald" />
                  </div>
                  <span className="summary-pill storage-pill">1.2 GB Used</span>
                </div>
                <Typography className="metric-label">Cloud Storage</Typography>
                <Typography className="metric-value">1.2 GB</Typography>
                <Typography className="metric-subtext">Of 5.0 GB allocated limit</Typography>
              </CardContent>
            </Card>
          </Grid>
          </Grid>
          </>
        )}

        {/* Modules Directory Display */}
        <Typography variant="h6" className="dashboard-section-title" sx={{ mb: 2 }}>
          {isModulePage ? '📦 Your Active Subscriptions' : '📦 Your Subscribed Modules & Cloud Apps'}
        </Typography>
        
        {totalCount === 0 ? (
          <Paper elevation={0} className="empty-modules-paper" sx={{ p: 4, textAlign: 'center' }}>
            <InfoOutlined sx={{ fontSize: '3rem', color: '#c7dcd0', mb: 2 }} />
            <Typography variant="h6">No Allocated Modules</Typography>
            <Typography variant="body2" color="textSecondary">
              Your firm has no registered module licenses. Please contact NZSolution SuperAdmin.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {modules.map((m) => (
              <Grid item xs={12} md={6} lg={4} key={m.id}>
                <Card className={`firm-module-card ${!m.is_accessible ? 'expired-card' : ''}`}>
                  <CardContent className="module-card-body-ca">
                    <div className="module-card-header-ca">
                      <Typography className="module-title-ca">{m.module_name}</Typography>
                      <Chip 
                        label={m.is_accessible ? 'Active' : 'Expired'} 
                        size="small" 
                        className={`status-pill-ca ${m.is_accessible ? 'active' : 'expired'}`}
                      />
                    </div>
                    
                    <Typography className="module-desc-ca">
                      {m.description || 'Enterprise CA cloud application module.'}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <div className="module-meta-info-ca">
                      <p><strong>License Plan:</strong> {m.plan_name}</p>
                      <p><strong>Validity Start:</strong> {m.start_date}</p>
                      <p><strong>Validity Expiry:</strong> {m.expiry_date}</p>
                      
                      {m.is_accessible ? (
                        <div className={`expiry-warning-pill ${getDaysLeftColorClass(m.days_remaining)}`}>
                          <HourglassEmpty fontSize="inherit" /> {m.days_remaining} Days Remaining
                        </div>
                      ) : (
                        <div className="expiry-warning-pill red-alert">
                          <Lock fontSize="inherit" /> Subscription Expired
                        </div>
                      )}
                    </div>

                    <Box sx={{ mt: 2.5 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={!m.is_accessible}
                        startIcon={m.is_accessible ? <Launch /> : <Lock />}
                        onClick={() => handleOpenModule(m.slug)}
                        className="open-module-btn-ca"
                      >
                        {m.is_accessible ? 'Open Module' : 'Locked (Expired)'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Access Error Alert Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#b7094c' }}>Subscription Expired</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {accessError || "Your subscription for this module has expired. Access is currently locked."}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: '#52796f' }}>
            To renew licenses or restore access permissions, please contact your account Super Administrator or NZSolution Sales Support.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setErrorDialogOpen(false)} variant="contained" sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' } }}>
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const FirmDashboard = () => {
  const { user } = useSelector((state) => state.auth)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [firmName, setFirmName] = useState('')
  const [accessError, setAccessError] = useState('')
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/ca/modules/`)
      setModules(res.data.modules || [])
      setFirmName(res.data.firm_name || 'NZ CA Partners')
    } catch (err) {
      console.error("Failed to load CA modules:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModule = async (slug) => {
    setAccessError('')
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/ca/modules/${slug}/access/`)
      // If the backend provides an explicit external URL for a completely different domain, go there.
      // Otherwise, use our internal module access guard.
      const url = res.data.frontend_url;
      const isLocalhostUrl = url && (url.includes('localhost') || url.includes('127.0.0.1'));
      
      if (url && url.startsWith('http') && !url.includes(window.location.hostname) && !isLocalhostUrl) {
        window.location.href = url;
      } else {
        navigate(`/ca/modules/${slug}`)
      }
    } catch (err) {
      console.error("Module access verification failed:", err)
      const errMsg = err.response?.data?.error || "Your subscription for this module has expired."
      setAccessError(errMsg)
      setErrorDialogOpen(true)
    }
  }

  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <FirmModulesList
            user={user}
            modules={modules}
            loading={loading}
            firmName={firmName}
            accessError={accessError}
            errorDialogOpen={errorDialogOpen}
            setErrorDialogOpen={setErrorDialogOpen}
            handleOpenModule={handleOpenModule}
          />
        }
      />
      <Route
        path="modules"
        element={
          <FirmModulesList
            user={user}
            modules={modules}
            loading={loading}
            firmName={firmName}
            accessError={accessError}
            errorDialogOpen={errorDialogOpen}
            setErrorDialogOpen={setErrorDialogOpen}
            handleOpenModule={handleOpenModule}
            isModulePage={true}
          />
        }
      />
      <Route path="settings" element={<EmailSettings type="firm" />} />
      <Route path="" element={<Navigate to="dashboard" />} />
    </Routes>
  )
}

export default FirmDashboard