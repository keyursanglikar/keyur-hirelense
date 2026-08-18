import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Typography, Button, Grid, Card, CardContent,
  TextField, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, CircularProgress, Divider,
  IconButton, Tooltip, Paper, Switch, FormControlLabel
} from '@mui/material'
import {
  Add, Edit, Layers, Launch, ArrowBack, CheckCircle,
  Close, Refresh, Circle, LinkOutlined, LockOutlined,
  LockOpenOutlined, DocumentScanner, Delete
} from '@mui/icons-material'
import MenuItem from '@mui/material/MenuItem'
import { Helmet } from 'react-helmet-async'
import api from '../api'
import './ModuleDirectory.css'

const STATUS_COLORS = {
  published: '#2d6a4f',
  draft: '#f59e0b',
  archived: '#6b7280',
  deprecated: '#ef4444'
}

// ─── URL auto-detection ───────────────────────────────────────
// Detects current origin (works for localhost AND live domains)
const detectOrigin = () => window.location.origin
// Builds the CA module access URL from slug
const buildFrontendUrl = (slug) =>
  slug ? `${detectOrigin()}/ca/${slug}` : ''
// Backend API URL (same host, port 8000 while dev; same origin on prod)
const buildBackendUrl = (slug) => {
  const { protocol, hostname } = window.location
  // On localhost use :8000; on live server same origin
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  const backendBase = isLocalhost ? `${protocol}//${hostname}:8000` : window.location.origin
  return slug ? `${backendBase}/api/${slug}/` : ''
}

const ModuleDirectory = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnToCaCreate = searchParams.get('returnTo') === 'ca-create'

  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [saving, setSaving] = useState(false)
  // Allow user to override the auto-computed URL
  const [urlOverride, setUrlOverride] = useState(false)

  // Local modules scanning state
  const [localModulesDialogOpen, setLocalModulesDialogOpen] = useState(false)
  const [localModules, setLocalModules] = useState([])
  const [scanning, setScanning] = useState(false)

  // Delete Confirmation State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const defaultForm = {
    module_name: '',
    display_name: '',
    slug: '',
    description: '',
    short_description: '',
    category: '',
    frontend_url: '',
    backend_url: '',
    database_name: '',
    status: 'draft',
    is_active: true,
    is_featured: false
  }
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/modules/`)
      setModules(res.data)
    } catch (err) {
      setErrorMsg('Failed to load modules. ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const scanLocalCodebase = async () => {
    setScanning(true)
    setLocalModulesDialogOpen(true)
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await api.get(`/firms/local-modules/`)
      setLocalModules(res.data)
    } catch (err) {
      setErrorMsg('Failed to scan local modules. ' + (err.response?.data?.error || err.message))
      setLocalModulesDialogOpen(false)
    } finally {
      setScanning(false)
    }
  }

  const selectLocalModule = (modConfig) => {
    setLocalModulesDialogOpen(false)
    setEditingModule(null)
    setUrlOverride(false)
    
    // Auto-fill form based on local config
    const slug = modConfig.slug || ''
    setForm({
      ...defaultForm,
      display_name: modConfig.display_name || '',
      slug: slug,
      module_name: modConfig.module_name || modConfig.folder_name || '',
      category: modConfig.category || '',
      short_description: modConfig.short_description || '',
      description: modConfig.description || '',
      database_name: modConfig.database_name || `${slug.replace(/-/g, '_')}_db`,
      frontend_url: buildFrontendUrl(slug),
      backend_url: buildBackendUrl(slug)
    })
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingModule(null)
    setUrlOverride(false)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (mod) => {
    setEditingModule(mod)
    const autoUrl = buildFrontendUrl(mod.slug)
    const autoBackendUrl = buildBackendUrl(mod.slug)
    
    let storedUrl = mod.frontend_url || ''
    let storedBackendUrl = mod.backend_url || ''
    
    // Normalize if the path matches but domain changed (e.g. from localhost to vercel)
    try {
      if (storedUrl && new URL(storedUrl).pathname === new URL(autoUrl).pathname) {
        storedUrl = autoUrl;
      }
      if (storedBackendUrl && new URL(storedBackendUrl).pathname === new URL(autoBackendUrl).pathname) {
        storedBackendUrl = autoBackendUrl;
      }
    } catch (e) {}

    setUrlOverride(storedUrl !== autoUrl && storedUrl !== '')
    setForm({
      module_name: mod.module_name || '',
      display_name: mod.display_name || '',
      slug: mod.slug || '',
      description: mod.description || '',
      short_description: mod.short_description || '',
      category: mod.category || '',
      frontend_url: storedUrl,
      backend_url: storedBackendUrl,
      database_name: mod.database_name || '',
      status: mod.status || 'draft',
      is_active: mod.is_active !== false,
      is_featured: mod.is_featured || false
    })
    setDialogOpen(true)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }
      // Auto-derive slug + module_name + DB name from display_name (only when creating)
      if (name === 'display_name' && !editingModule) {
        const slug = value.toLowerCase().trim()
          .replace(/[&]/g, 'and')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
        const moduleName = slug.replace(/-/g, '_')
        updated.slug = slug
        updated.module_name = moduleName
        updated.database_name = updated.database_name || `${moduleName}_db`
        // Auto-compute frontend + backend URLs from the new slug
        if (!urlOverride) {
          updated.frontend_url = buildFrontendUrl(slug)
          updated.backend_url = buildBackendUrl(slug)
        }
      }
      // When slug is manually edited, recompute URLs unless overridden
      if (name === 'slug' && !urlOverride) {
        updated.frontend_url = buildFrontendUrl(value)
        updated.backend_url = buildBackendUrl(value)
      }
      return updated
    })
  }

  const handleDeleteModule = (mod) => {
    setModuleToDelete(mod)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return
    setDeleting(true)
    setErrorMsg('')
    try {
      await api.delete(`/firms/modules/${moduleToDelete.id}/`)
      fetchModules()
      setDeleteDialogOpen(false)
      setModuleToDelete(null)
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete module')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!form.display_name || !form.slug || !form.database_name) {
      setErrorMsg('Display Name, Slug, and Database Name are required.')
      return
    }
    // Always recompute URLs if not overridden before saving
    const finalForm = {
      ...form,
      frontend_url: urlOverride ? form.frontend_url : buildFrontendUrl(form.slug),
      backend_url: urlOverride ? form.backend_url : buildBackendUrl(form.slug)
    }
    setSaving(true)
    setErrorMsg('')
    try {
      const token = sessionStorage.getItem('access_token')
      if (editingModule) {
        await api.patch(
          `/firms/modules/${editingModule.id}/`,
          finalForm
        )
        setSuccessMsg(`✅ Module "${form.display_name}" updated successfully.`)
      } else {
        await api.post(
          `/firms/modules/`,
          finalForm
        )
        setSuccessMsg(`✅ Module "${form.display_name}" created successfully!`)
      }
      setDialogOpen(false)
      fetchModules()
    } catch (err) {
      setErrorMsg('Failed to save module: ' + (err.response?.data?.error || JSON.stringify(err.response?.data) || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet><title>Module Directory | NZSolution</title></Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layers sx={{ color: '#2d6a4f' }} /> Module Directory
          </Typography>
          <Typography variant="body2" sx={{ color: '#52796f', mt: 0.5 }}>
            Manage all platform software modules available for subscription
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {returnToCaCreate && (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/superadmin/ca-firms/create')}
              sx={{ borderColor: '#2d6a4f', color: '#2d6a4f', fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
            >
              Back to CA Firm Creation
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchModules}
            sx={{ borderColor: '#adc1b6', color: '#52796f', borderRadius: '8px', textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DocumentScanner />}
            onClick={scanLocalCodebase}
            disabled={scanning}
            sx={{ backgroundColor: '#1b4332', '&:hover': { backgroundColor: '#081c15' }, borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
          >
            Scan modules
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' }, borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
          >
            Add New Module
          </Button>
        </Box>
      </Box>

      {returnToCaCreate && (
        <Alert
          severity="info"
          sx={{ mb: 3, borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
          icon={<Layers sx={{ color: '#2d6a4f' }} />}
        >
          <strong>You're here from CA Firm Creation.</strong> Create or verify your modules below, then click <strong>"Back to CA Firm Creation"</strong> to continue assigning them to the new firm.
        </Alert>
      )}

      {errorMsg && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }} icon={<CheckCircle />} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* Module Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="success" />
        </Box>
      ) : modules.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 8, borderRadius: '12px', border: '2px dashed #d8f3dc' }}>
          <Layers sx={{ fontSize: 64, color: '#b7e4c7', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1b4332', mb: 1 }}>
            No Modules Created Yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#52796f', mb: 3, maxWidth: 400, mx: 'auto' }}>
            Modules are the software packages CA firms can subscribe to (e.g., Fee Estimation, GST, Income Tax). Create your first module to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' }, borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
          >
            Create First Module
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {modules.map(mod => (
            <Grid xs={12} sm={6} md={4} key={mod.id}>
              <Card className="module-dir-card" sx={{ borderRadius: '12px', border: '1px solid #e2efe6', '&:hover': { boxShadow: '0 6px 24px rgba(45,106,79,0.12)', transform: 'translateY(-2px)' }, transition: 'all 0.2s', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '8px', background: 'linear-gradient(135deg, #1b4332, #2d6a4f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers sx={{ color: '#fff', fontSize: 18 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#1b4332', fontSize: '0.95rem', lineHeight: 1.2 }}>{mod.display_name}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#7f9f8c', fontFamily: 'monospace' }}>{mod.slug}</Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={mod.status}
                      size="small"
                      sx={{
                        background: STATUS_COLORS[mod.status] + '20',
                        color: STATUS_COLORS[mod.status],
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: 20
                      }}
                    />
                  </Box>

                  <Typography sx={{ fontSize: '0.8rem', color: '#52796f', mb: 1.5, minHeight: 36, lineHeight: 1.5 }}>
                    {mod.short_description || mod.description || 'No description provided.'}
                  </Typography>

                  {mod.category && (
                    <Chip label={mod.category} size="small" sx={{ mb: 1, background: '#f0fdf4', color: '#2d6a4f', fontSize: '0.7rem' }} />
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {(mod.plans || []).slice(0, 3).map(p => (
                      <Chip key={p.id} label={p.plan_name} size="small"
                        sx={{ fontSize: '0.65rem', background: '#fafdfb', border: '1px solid #e2efe6', color: '#40916c' }}
                      />
                    ))}
                    {(mod.plans || []).length === 0 && (
                      <Chip label="No plans yet" size="small" sx={{ fontSize: '0.65rem', background: '#fff7ed', color: '#c2410c' }} />
                    )}
                  </Box>

                  {mod.frontend_url && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                      <Launch sx={{ fontSize: 12, color: '#7f9f8c' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: '#7f9f8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(() => {
                          try {
                            const urlObj = new URL(mod.frontend_url);
                            return `${window.location.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
                          } catch (e) {
                            return mod.frontend_url;
                          }
                        })()}
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ borderColor: '#e8f0eb', mb: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Circle sx={{ fontSize: 8, color: mod.is_active ? '#2d6a4f' : '#9ca3af' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: mod.is_active ? '#2d6a4f' : '#9ca3af', fontWeight: 600 }}>
                        {mod.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit Module">
                        <IconButton size="small" onClick={() => openEdit(mod)} sx={{ color: '#2d6a4f', '&:hover': { background: '#f0fdf4' } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Module">
                        <IconButton size="small" onClick={() => handleDeleteModule(mod)} sx={{ color: '#dc2626', '&:hover': { background: '#fef2f2' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Module Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1b4332', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layers sx={{ color: '#2d6a4f' }} />
            {editingModule ? `Edit: ${editingModule.display_name}` : 'Create New Module'}
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {errorMsg && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <TextField
                label="Display Name *" name="display_name" fullWidth size="small"
                value={form.display_name} onChange={handleFormChange}
                helperText="e.g. Fee Estimation, GST Returns"
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Slug *" name="slug" fullWidth size="small"
                value={form.slug} onChange={handleFormChange}
                helperText="URL path segment — auto-filled from name"
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Module Key (internal) *" name="module_name" fullWidth size="small"
                value={form.module_name} onChange={handleFormChange}
                helperText="e.g. fee_estimation — auto-filled"
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Category" name="category" fullWidth size="small"
                value={form.category} onChange={handleFormChange}
                placeholder="e.g. Taxation, Audit, Payroll"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Short Description" name="short_description" fullWidth size="small"
                value={form.short_description} onChange={handleFormChange}
                placeholder="One-line summary shown on module cards"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Full Description" name="description" fullWidth size="small" multiline rows={2}
                value={form.description} onChange={handleFormChange}
              />
            </Grid>

            {/* ─── AUTO-COMPUTED URL SECTION ─── */}
            <Grid xs={12}>
              <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkOutlined sx={{ color: '#2d6a4f', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, color: '#1b4332', fontSize: '0.85rem' }}>
                      Auto-Detected Module URLs
                    </Typography>
                  </Box>
                  <Tooltip title={urlOverride ? 'Custom override active — click to auto-compute' : 'Click to enter custom URLs'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {urlOverride
                        ? <LockOpenOutlined sx={{ fontSize: 15, color: '#f59e0b' }} />
                        : <LockOutlined sx={{ fontSize: 15, color: '#2d6a4f' }} />
                      }
                      <Typography
                        sx={{ fontSize: '0.72rem', color: urlOverride ? '#f59e0b' : '#2d6a4f', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}
                        onClick={() => {
                          setUrlOverride(v => !v)
                          if (urlOverride) {
                            // Reset back to auto-computed
                            setForm(prev => ({
                              ...prev,
                              frontend_url: buildFrontendUrl(prev.slug),
                              backend_url: buildBackendUrl(prev.slug)
                            }))
                          }
                        }}
                      >
                        {urlOverride ? 'Custom Override (click to reset)' : 'Auto-computed (click to override)'}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>

                {/* Frontend URL */}
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#52796f', mb: 0.5, fontWeight: 600 }}>CA Frontend Access URL</Typography>
                  {urlOverride ? (
                    <TextField
                      name="frontend_url" fullWidth size="small"
                      value={form.frontend_url} onChange={handleFormChange}
                      placeholder={`${detectOrigin()}/ca/your-module-slug`}
                      sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                    />
                  ) : (
                    <Box sx={{
                      background: '#fff', border: '1px solid #d8f3dc', borderRadius: '6px',
                      px: 1.5, py: 1, fontFamily: 'monospace', fontSize: '0.78rem',
                      color: form.slug ? '#1b4332' : '#95b8a8', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', gap: 1
                    }}>
                      <Launch sx={{ fontSize: 13, color: '#2d6a4f', flexShrink: 0 }} />
                      {form.slug
                        ? <><strong>{detectOrigin()}</strong>/ca/<strong>{form.slug}</strong></>
                        : <span style={{ color: '#95b8a8' }}>{detectOrigin()}/ca/&lt;slug&gt;</span>
                      }
                    </Box>
                  )}
                </Box>

                {/* Backend URL */}
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#52796f', mb: 0.5, fontWeight: 600 }}>Backend API URL</Typography>
                  {urlOverride ? (
                    <TextField
                      name="backend_url" fullWidth size="small"
                      value={form.backend_url} onChange={handleFormChange}
                      placeholder={buildBackendUrl('your-slug')}
                      sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                    />
                  ) : (
                    <Box sx={{
                      background: '#fff', border: '1px solid #d8f3dc', borderRadius: '6px',
                      px: 1.5, py: 1, fontFamily: 'monospace', fontSize: '0.78rem',
                      color: form.slug ? '#1b4332' : '#95b8a8',
                      display: 'flex', alignItems: 'center', gap: 1
                    }}>
                      <Launch sx={{ fontSize: 13, color: '#2d6a4f', flexShrink: 0 }} />
                      {form.slug
                        ? <>{buildBackendUrl(form.slug)}</>
                        : <span style={{ color: '#95b8a8' }}>{buildBackendUrl('<slug>')}</span>
                      }
                    </Box>
                  )}
                </Box>

                <Typography sx={{ fontSize: '0.7rem', color: '#52796f', mt: 1.2, fontStyle: 'italic' }}>
                  🌐 Detected origin: <strong>{detectOrigin()}</strong>
                  {window.location.hostname === 'localhost'
                    ? ' (localhost development mode)'
                    : ' (live server / production domain)'}
                </Typography>
              </Box>
            </Grid>

            <Grid xs={12} sm={6}>
              <TextField
                label="Database Name *" name="database_name" fullWidth size="small"
                value={form.database_name} onChange={handleFormChange}
                placeholder="e.g. fee_estimation_db"
                helperText="Auto-filled — edit if needed"
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Status" name="status"
                value={form.status} onChange={handleFormChange}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
                <MenuItem value="deprecated">Deprecated</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#52796f', textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' }, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            {saving ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Local Modules Discovery Dialog */}
      <Dialog open={localModulesDialogOpen} onClose={() => setLocalModulesDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1b4332', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DocumentScanner sx={{ color: '#2d6a4f' }} />
            Discovered Local Modules
          </Box>
          <IconButton onClick={() => setLocalModulesDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0, minHeight: '200px' }}>
          {scanning ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6 }}>
              <CircularProgress color="success" size={32} sx={{ mb: 2 }} />
              <Typography sx={{ color: '#52796f' }}>Scanning backend directory for module.json files...</Typography>
            </Box>
          ) : localModules.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#52796f', mb: 2 }}>No uninstalled local modules found.</Typography>
              <Typography variant="body2" sx={{ color: '#7f9f8c' }}>
                To add a module, create a new folder in your backend containing a <code>module.json</code> file.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: '#52796f', mb: 2 }}>
                Found {localModules.length} module configuration(s) in the local codebase. Select one to automatically fill out the creation form.
              </Typography>
              <Grid container spacing={2}>
                {localModules.map((mod, idx) => (
                  <Grid item xs={12} key={idx}>
                    <Card variant="outlined" sx={{ 
                      borderRadius: '8px', borderColor: mod.is_installed ? '#e8f0eb' : '#2d6a4f',
                      background: mod.is_installed ? '#fafdfb' : '#f0fdf4',
                      opacity: mod.is_installed ? 0.7 : 1
                    }}>
                      <CardContent sx={{ p: '16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, color: '#1b4332' }}>{mod.display_name || mod.folder_name}</Typography>
                            {mod.is_installed && <Chip label="Already Installed" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />}
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: '#52796f', fontFamily: 'monospace' }}>
                            📁 backend/{mod.folder_name}
                          </Typography>
                        </Box>
                        <Button 
                          variant="contained" 
                          size="small" 
                          disabled={mod.is_installed}
                          onClick={() => selectLocalModule(mod)}
                          sx={{ backgroundColor: '#2d6a4f', textTransform: 'none', borderRadius: '6px' }}
                        >
                          Select &amp; Auto-fill
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Delete sx={{ color: '#dc2626' }} /> Confirm Deletion
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Typography sx={{ color: '#374151', fontSize: '0.9rem' }}>
            Are you sure you want to permanently delete the module <strong>{moduleToDelete?.display_name}</strong>?
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', mt: 1 }}>
            This action will remove it from the portal and database. No physical project files will be deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#6b7280', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteModule} 
            variant="contained" 
            disabled={deleting}
            sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' }, textTransform: 'none', borderRadius: '6px' }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}

export default ModuleDirectory
