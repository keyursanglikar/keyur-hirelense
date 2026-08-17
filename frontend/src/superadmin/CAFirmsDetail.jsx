// frontend/src/components/CAFirmsDetail.jsx

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent
} from '@mui/material'
import {
  ArrowBack,
  MailOutlined,
  Block,
  CheckCircle,
  Delete,
  Add,
  Edit,
  CardMembership,
  Business,
  Person,
  CheckCircleOutlined,
  CalendarToday,
  RemoveCircle
} from '@mui/icons-material'
import api from '../api'
import './CAFirmsDetail.css'

const CAFirmsDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [firmData, setFirmData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Subscription Modal State
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [availableModules, setAvailableModules] = useState([])
  const [selectedSubAction, setSelectedSubAction] = useState('add') // add, edit, cancel
  const [subFormData, setSubFormData] = useState({
    module_id: '',
    plan_id: '',
    start_date: '',
    expiry_date: '',
    price: '0.00',
    auto_renew: false
  })

  useEffect(() => {
    fetchFirmDetails()
    fetchAvailableModules()
  }, [id])

  const fetchFirmDetails = async () => {
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/${id}/`)
      setFirmData(res.data)
    } catch (err) {
      console.error("Failed to load details:", err)
      setErrorMessage("CA Firm details not found or loading failed.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableModules = async () => {
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/modules/`)
      setAvailableModules(res.data)
    } catch (err) {
      console.error("Failed to load available modules:", err)
    }
  }

  const handleAction = async (actionType) => {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.post(`/firms/${id}/action/`, 
        { action: actionType }
      )
      setSuccessMessage(res.data.message)
      if (actionType === 'delete') {
        setTimeout(() => navigate('/superadmin/firms'), 1500)
      } else {
        fetchFirmDetails()
      }
    } catch (err) {
      console.error("Action failed:", err)
      setErrorMessage(err.response?.data?.error || "Failed to execute firm action.")
    }
  }

  const handleResendActivation = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.post(`/firms/${id}/resend-activation/`, 
        {}
      )
      setSuccessMessage(res.data.message)
    } catch (err) {
      console.error("Resend token failed:", err)
      setErrorMessage(err.response?.data?.error || "Failed to resend activation link.")
    }
  }

  // Open Subscription Modal
  const openSubscriptionModal = (action, existingSub = null) => {
    setSelectedSubAction(action)
    setErrorMessage('')
    setSuccessMessage('')
    
    if (action === 'add') {
      const today = new Date().toISOString().split('T')[0]
      setSubFormData({
        module_id: '',
        plan_id: '',
        start_date: today,
        expiry_date: '',
        price: '0.00',
        auto_renew: false
      })
    } else if (existingSub) {
      // Prefill values
      setSubFormData({
        module_id: existingSub.module_id,
        plan_id: existingSub.plan_id,
        start_date: existingSub.start_date,
        expiry_date: existingSub.expiry_date,
        price: '0.00', // Will be loaded dynamically
        auto_renew: existingSub.auto_renew
      })
    }
    setSubModalOpen(true)
  }

  const handleSubFormChange = (field, value) => {
    setSubFormData(prev => {
      const updated = { ...prev, [field]: value }

      if (field === 'module_id') {
        // Reset plan choice and price
        updated.plan_id = ''
        updated.price = '0.00'
      }

      if (field === 'plan_id' && updated.module_id) {
        const module = availableModules.find(m => m.id === updated.module_id)
        const plan = module?.plans.find(p => p.id === value)
        if (plan) {
          updated.price = plan.price
          const start = new Date(updated.start_date)
          start.setDate(start.getDate() + (plan.duration_days || 30))
          updated.expiry_date = start.toISOString().split('T')[0]
        }
      }

      if (field === 'start_date' && updated.plan_id && updated.module_id) {
        const module = availableModules.find(m => m.id === updated.module_id)
        const plan = module?.plans.find(p => p.id === updated.plan_id)
        if (plan) {
          const start = new Date(value)
          start.setDate(start.getDate() + (plan.duration_days || 30))
          updated.expiry_date = start.toISOString().split('T')[0]
        }
      }

      return updated
    })
  }

  const handleSubFormSubmit = async () => {
    setErrorMessage('')
    try {
      const token = sessionStorage.getItem('access_token')
      const payload = {
        action: selectedSubAction,
        ...subFormData
      }
      await api.post(`/firms/${id}/subscriptions/`, 
        payload
      )
      setSubModalOpen(false)
      setSuccessMessage("Module subscription updated successfully.")
      fetchFirmDetails()
    } catch (err) {
      console.error("Subscription update failed:", err)
      setErrorMessage(err.response?.data?.error || "Failed to update subscription.")
    }
  }

  if (loading) {
    return <Box className="spinner-container"><CircularProgress color="success" /></Box>
  }

  if (!firmData) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">CA Firm not found.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/superadmin/firms')} sx={{ mt: 2 }}>
          Back to list
        </Button>
      </Box>
    )
  }

  const { firm, admin, subscriptions } = firmData

  return (
    <Box className="firm-details-container">
      {/* Top action controls */}
      <Box className="firm-details-actions-bar" sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/superadmin/firms')}
          className="back-list-btn"
        >
          Back to List
        </Button>
        <div className="action-buttons-group">
          {firm.status === 'active' ? (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Block />}
              onClick={() => handleAction('suspend')}
              className="action-btn"
            >
              Suspend Firm
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleAction('activate')}
              className="action-btn"
            >
              Activate Firm
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => handleAction('delete')}
            className="action-btn"
          >
            Delete Firm
          </Button>
        </div>
      </Box>

      {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}
      {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column: Firm & Admin Info */}
        <Grid item xs={12} lg={7}>
          {/* Section: Firm Info */}
          <Paper elevation={0} className="details-paper" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" className="details-section-title"><Business /> CA Firm Information</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2} className="info-grid">
              <Grid item xs={6} className="info-label">Firm Name</Grid>
              <Grid item xs={6} className="info-value">{firm.firm_name}</Grid>
              <Grid item xs={6} className="info-label">Firm Code</Grid>
              <Grid item xs={6} className="info-value text-code">{firm.firm_code}</Grid>
              <Grid item xs={6} className="info-label">Registration Number</Grid>
              <Grid item xs={6} className="info-value">{firm.registration_number || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">GST Number</Grid>
              <Grid item xs={6} className="info-value">{firm.gst_number || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">PAN Number</Grid>
              <Grid item xs={6} className="info-value">{firm.pan_number || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">TAN / CIN / LLP</Grid>
              <Grid item xs={6} className="info-value">{firm.llp_number || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">Contact Email</Grid>
              <Grid item xs={6} className="info-value">{firm.email}</Grid>
              <Grid item xs={6} className="info-label">Mobile Phone</Grid>
              <Grid item xs={6} className="info-value">{firm.mobile}</Grid>
              <Grid item xs={6} className="info-label">City, State</Grid>
              <Grid item xs={6} className="info-value">{firm.city || 'N/A'}, {firm.state || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">Established Year</Grid>
              <Grid item xs={6} className="info-value">{firm.established_year || 'N/A'}</Grid>
              <Grid item xs={6} className="info-label">Firm Status</Grid>
              <Grid item xs={6} className="info-value">
                <Chip label={firm.status} size="small" className={`status-chip-val ${firm.status === 'active' ? 'active' : 'suspended'}`} />
              </Grid>
            </Grid>
          </Paper>

          {/* Section: Admin Info */}
          <Paper elevation={0} className="details-paper" sx={{ p: 3 }}>
            <Typography variant="h6" className="details-section-title"><Person /> Primary CA Administrator Details</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2} className="info-grid">
              <Grid item xs={6} className="info-label">Admin Name</Grid>
              <Grid item xs={6} className="info-value">{admin.name}</Grid>
              <Grid item xs={6} className="info-label">Login Username / Email</Grid>
              <Grid item xs={6} className="info-value">{admin.email}</Grid>
              <Grid item xs={6} className="info-label">Mobile Phone</Grid>
              <Grid item xs={6} className="info-value">{admin.mobile}</Grid>
              <Grid item xs={6} className="info-label">Designation</Grid>
              <Grid item xs={6} className="info-value">{admin.designation}</Grid>
              <Grid item xs={6} className="info-label">Verification Status</Grid>
              <Grid item xs={6} className="info-value">
                <Chip 
                  label={admin.is_verified ? 'Verified' : 'Pending Verification'} 
                  size="small" 
                  className={`status-chip-val ${admin.is_verified ? 'active' : 'suspended'}`} 
                />
              </Grid>
              <Grid item xs={6} className="info-label">Last Login</Grid>
              <Grid item xs={6} className="info-value">{admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never logged in'}</Grid>
            </Grid>
            {!admin.is_verified && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<MailOutlined />}
                  onClick={handleResendActivation}
                  className="resend-activation-btn"
                >
                  Resend Activation Email
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Subscriptions & Modules */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={0} className="details-paper" sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" className="details-section-title"><CardMembership /> Subscription Licenses</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => openSubscriptionModal('add')}
                className="add-sub-btn"
              >
                Add Module
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {subscriptions.length === 0 ? (
              <Box className="empty-subs-box">
                <Typography variant="body2" color="textSecondary">No active modules assigned to this CA Firm.</Typography>
              </Box>
            ) : (
              <Box className="subscriptions-list">
                {subscriptions.map((sub) => (
                  <Card key={sub.id} variant="outlined" className="sub-list-card" sx={{ mb: 2, borderRadius: '12px' }}>
                    <CardContent className="sub-card-body">
                      <div className="sub-card-header">
                        <Typography className="sub-card-name">📦 {sub.module_name}</Typography>
                        <Chip label={sub.status} size="small" className={`status-chip-sub ${sub.status === 'active' ? 'active' : 'expired'}`} />
                      </div>
                      <Typography className="sub-card-plan">Plan: {sub.plan_name}</Typography>
                      <Typography className="sub-card-dates">
                        <CalendarToday fontSize="inherit" /> {sub.start_date} to {sub.expiry_date}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <div className="sub-card-actions">
                        <Button 
                          size="small" 
                          startIcon={<Edit />}
                          onClick={() => openSubscriptionModal('edit', sub)}
                          className="sub-action-btn-item edit"
                        >
                          Modify / Extend
                        </Button>
                        <Button 
                          size="small" 
                          color="error" 
                          startIcon={<RemoveCircle />}
                          onClick={() => openSubscriptionModal('cancel', sub)}
                          className="sub-action-btn-item cancel"
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Subscription Dialog Modal */}
      <Dialog open={subModalOpen} onClose={() => setSubModalOpen(false)} maxWidth="sm" fullWidth className="sub-dialog">
        <DialogTitle className="dialog-title-text">
          {selectedSubAction === 'add' && 'Add Module Subscription'}
          {selectedSubAction === 'edit' && 'Modify / Extend Subscription'}
          {selectedSubAction === 'cancel' && 'Confirm Subscription Cancellation'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedSubAction === 'cancel' ? (
            <Typography variant="body1">
              Are you sure you want to cancel the subscription license for this module? The CA Firm will lose all access to the module immediately. This action cannot be undone.
            </Typography>
          ) : (
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" disabled={selectedSubAction === 'edit'}>
                  <InputLabel>Module Allocation</InputLabel>
                  <Select
                    value={subFormData.module_id}
                    onChange={(e) => handleSubFormChange('module_id', e.target.value)}
                    label="Module Allocation"
                  >
                    {availableModules.map(m => (
                      <MenuItem key={m.id} value={m.id}>{m.display_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {subFormData.module_id && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Subscription Plan</InputLabel>
                      <Select
                        value={subFormData.plan_id}
                        onChange={(e) => handleSubFormChange('plan_id', e.target.value)}
                        label="Subscription Plan"
                      >
                        {availableModules.find(m => m.id === subFormData.module_id)?.plans.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.plan_name} ({p.price})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Start Date"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={subFormData.start_date}
                      onChange={(e) => handleSubFormChange('start_date', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Expiry Date"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={subFormData.expiry_date}
                      onChange={(e) => handleSubFormChange('expiry_date', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={subFormData.auto_renew}
                          onChange={(e) => handleSubFormChange('auto_renew', e.target.checked)}
                          color="success"
                        />
                      }
                      label="Enable Auto-Renewal for Module"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSubModalOpen(false)} className="dialog-cancel-btn">
            Cancel
          </Button>
          <Button 
            onClick={handleSubFormSubmit} 
            variant="contained" 
            className={selectedSubAction === 'cancel' ? 'dialog-action-btn-cancel' : 'dialog-action-btn-save'}
            disabled={!subFormData.module_id || (!subFormData.plan_id && selectedSubAction !== 'cancel')}
          >
            {selectedSubAction === 'cancel' ? 'Confirm Cancellation' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CAFirmsDetail
