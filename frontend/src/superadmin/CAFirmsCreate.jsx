// frontend/src/components/CAFirmsCreate.jsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import {
  ArrowBack,
  ArrowForward,
  Save,
  Business,
  Person,
  Layers,
  CardMembership,
  CheckCircleOutlined,
  UploadFile,
  Download,
  Add
} from '@mui/icons-material'
import axios from 'axios'
import * as XLSX from 'xlsx'
import emailjs from '@emailjs/browser'
import './CAFirmsCreate.css'

const steps = [
  'Firm Information',
  'CA Admin Details',
  'Module Selection',
  'Subscriptions & Plans',
  'Review & Create'
]

const CAFirmsCreate = () => {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(() => {
    // Restore step if returning from module creation
    const saved = sessionStorage.getItem('ca_create_step')
    return saved ? parseInt(saved) : 0
  })
  const [availableModules, setAvailableModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [downloadFormat, setDownloadFormat] = useState('csv')
  
  // Restore saved form data from sessionStorage if returning from Module Directory
  const savedFormData = (() => {
    try {
      const raw = sessionStorage.getItem('ca_create_form')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()

  const [formData, setFormData] = useState(savedFormData || {
    // Step 1: Firm Info
    firm_name: '',
    firm_code: '',
    registration_number: '',
    gst_number: '',
    pan_number: '',
    tan_number: '',
    cin_number: '',
    llp_number: '',
    email: '',
    mobile: '',
    alternate_mobile: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    business_type: 'Proprietorship',
    firm_size: 'Small',
    established_year: new Date().getFullYear(),
    billing_email: '',
    billing_phone: '',
    billing_address: '',

    // Step 2: Admin Info
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_mobile: '',
    admin_designation: 'CA Partner',

    // Step 3 & 4: Selected modules and plans
    selectedModuleIds: [],
    subscriptions: {}
  })

  // Save form state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('ca_create_form', JSON.stringify(formData))
  }, [formData])

  useEffect(() => {
    sessionStorage.setItem('ca_create_step', String(activeStep))
  }, [activeStep])

  // Clear saved state on successful submit
  const clearSavedState = () => {
    sessionStorage.removeItem('ca_create_form')
    sessionStorage.removeItem('ca_create_step')
  }

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await axios.get('http://localhost:8000/api/firms/modules/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAvailableModules(res.data)
      
      const initialSubs = {}
      res.data.forEach(m => {
        const defaultPlan = m.plans[0] || { id: '', price: '0.00', duration_days: 30 }
        const today = new Date().toISOString().split('T')[0]
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + (defaultPlan.duration_days || 30))
        const expiryStr = expiry.toISOString().split('T')[0]

        initialSubs[m.id] = {
          plan_id: defaultPlan.id,
          start_date: today,
          expiry_date: expiryStr,
          price: defaultPlan.price,
          auto_renew: false
        }
      })
      setFormData(prev => ({ ...prev, subscriptions: initialSubs }))
    } catch (err) {
      console.error("Failed to load modules:", err)
      setErrorMessage("Failed to load platform module configurations.")
    } finally {
      setLoadingModules(false)
    }
  }

  const handleTextChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleModuleToggle = (mid) => {
    setFormData(prev => {
      const ids = [...prev.selectedModuleIds]
      const index = ids.indexOf(mid)
      if (index > -1) {
        ids.splice(index, 1)
      } else {
        ids.push(mid)
      }
      return { ...prev, selectedModuleIds: ids }
    })
  }

  const handleSubscriptionChange = (mid, field, value) => {
    setFormData(prev => {
      const updatedSubs = { ...prev.subscriptions }
      const modSub = { ...updatedSubs[mid], [field]: value }

      const module = availableModules.find(m => m.id === mid)
      const plan = module?.plans.find(p => p.id === modSub.plan_id)

      const calculateExpiry = (startStr, durationVal) => {
        const start = new Date(startStr)
        if (durationVal && durationVal !== 'default' && durationVal !== 'custom') {
          start.setMonth(start.getMonth() + parseInt(durationVal))
          return start.toISOString().split('T')[0]
        } else if (durationVal !== 'custom' && plan) {
          if (plan.duration_years) start.setFullYear(start.getFullYear() + plan.duration_years)
          else if (plan.duration_months) start.setMonth(start.getMonth() + plan.duration_months)
          else if (plan.duration_days) start.setDate(start.getDate() + plan.duration_days)
          else start.setMonth(start.getMonth() + 1)
          return start.toISOString().split('T')[0]
        }
        return modSub.expiry_date // custom or keep existing
      }

      if (field === 'plan_id' && plan) {
        modSub.price = plan.price
        
        // Automatically sync the Custom Duration dropdown with the plan's duration
        if (plan.duration_days === 90) modSub.duration_override = '3';
        else if (plan.duration_days === 180) modSub.duration_override = '6';
        else if (plan.duration_days === 365) modSub.duration_override = '12';
        else if (plan.duration_days === 730) modSub.duration_override = '24';
        else modSub.duration_override = 'default';

        modSub.expiry_date = calculateExpiry(modSub.start_date, modSub.duration_override)
      } else if (field === 'start_date') {
        modSub.expiry_date = calculateExpiry(value, modSub.duration_override)
      } else if (field === 'duration_override') {
        modSub.expiry_date = calculateExpiry(modSub.start_date, value)
      }

      updatedSubs[mid] = modSub
      return { ...prev, subscriptions: updatedSubs }
    })
  }

  // RFC-4180 Compliant CSV Parser
  const parseCSVText = (text) => {
    const result = []
    let row = []
    let inQuotes = false
    let currentVal = ''

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim())
        currentVal = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++
        }
        row.push(currentVal.trim())
        if (row.length > 0 && row.some(cell => cell !== '')) {
          result.push(row)
        }
        row = []
        currentVal = ''
      } else {
        currentVal += char
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim())
      result.push(row)
    }
    return result
  }

  const handleFileUpload = (e) => {
    setErrorMessage('')
    setImportSuccess('')
    const file = e.target.files[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()

    if (fileExtension === 'csv') {
      reader.onload = (event) => {
        try {
          const text = event.target.result
          const rows = parseCSVText(text)
          processImportedRows(rows)
        } catch (err) {
          console.error(err)
          setErrorMessage("Failed to parse the uploaded CSV file.")
        }
      }
      reader.readAsText(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          processImportedRows(json)
        } catch (err) {
          console.error(err)
          setErrorMessage("Failed to parse the uploaded Excel file.")
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setErrorMessage("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.")
    }
  }

  const processImportedRows = (rows) => {
    if (rows.length < 2) {
      setErrorMessage("Template must contain a header row and at least one data row.")
      return
    }

    const headers = rows[0]
    const values = rows[1]
    const mapped = {}

    headers.forEach((header, index) => {
      if (header) {
        const key = header.toString().trim()
        if (values[index] !== undefined && key in formData) {
          mapped[key] = values[index].toString().trim()
        }
      }
    })

    setFormData(prev => ({
      ...prev,
      ...mapped
    }))
    setImportSuccess("Data file successfully parsed! Form fields pre-populated.")
  }

  const downloadTemplate = () => {
    const headers = [
      "firm_name", "firm_code", "registration_number", "business_type", "firm_size", "established_year",
      "gst_number", "pan_number", "tan_number", "llp_number",
      "email", "mobile", "alternate_mobile", "website",
      "address_line1", "address_line2", "city", "state", "pincode", "country",
      "billing_email", "billing_phone", "billing_address",
      "admin_first_name", "admin_last_name", "admin_designation", "admin_email", "admin_mobile"
    ]
    const sampleRow = [
      "NZSolution CA Partners LLP", "NZPARTNERS", "REG98765", "LLP", "Medium", "2026",
      "27AAAAA1111A1Z1", "ABCDE1234F", "TAN98765", "LLP98765",
      "contact@nzpartners.com", "9876543210", "9876543211", "https://nzpartners.com",
      "456 Emerald Towers", "Sector 5", "Pune", "Maharashtra", "411001", "India",
      "billing@nzpartners.com", "9876543210", "456 Emerald Towers, Pune",
      "Karan", "Sharma", "Senior CA Partner", "karan.sharma@nzpartners.com", "9876543210"
    ]
    
    if (downloadFormat === 'csv') {
      const formatCell = (val) => {
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const csvContent = [
        headers.join(","),
        sampleRow.map(formatCell).join(",")
      ].join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "nzsolution_ca_onboarding_template.csv")
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const data = [headers, sampleRow]
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "CA Onboarding")
      
      const fileType = downloadFormat === 'xls' ? 'xls' : 'xlsx'
      XLSX.writeFile(workbook, `nzsolution_ca_onboarding_template.${fileType}`)
    }
  }

  const handleNext = () => {
    setErrorMessage('')
    
    if (activeStep === 0) {
      if (!formData.firm_name || !formData.firm_code || !formData.email || !formData.mobile) {
        setErrorMessage("Please fill all required firm information (Firm Name, Code, Email, Mobile).")
        return
      }
    }
    if (activeStep === 1) {
      if (!formData.admin_first_name || !formData.admin_last_name || !formData.admin_email || !formData.admin_mobile) {
        setErrorMessage("Please fill all required CA Admin details.")
        return
      }
    }
    if (activeStep === 2) {
      if (formData.selectedModuleIds.length === 0) {
        setErrorMessage("Please select at least one module for this CA Firm.")
        return
      }
    }

    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrorMessage('')
    setActiveStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setErrorMessage('')

    const finalSubscriptions = formData.selectedModuleIds.map(mid => ({
      module_id: mid,
      plan_id: formData.subscriptions[mid].plan_id,
      start_date: formData.subscriptions[mid].start_date,
      expiry_date: formData.subscriptions[mid].expiry_date,
      price: formData.subscriptions[mid].price,
      auto_renew: formData.subscriptions[mid].auto_renew
    }))

    const payload = {
      ...formData,
      subscriptions: finalSubscriptions
    }
    delete payload.selectedModuleIds

    try {
      const token = sessionStorage.getItem('access_token')
      const res = await axios.post('http://localhost:8000/api/firms/', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Send onboarding email via EmailJS using backend-built payload + credentials
      const { email_payload, emailjs_credentials } = res.data

      if (email_payload && emailjs_credentials) {
        const { service_id, template_id, public_key } = emailjs_credentials
        if (service_id && template_id && public_key) {
          try {
            await emailjs.send(service_id, template_id, email_payload, public_key)
            console.log('✅ Onboarding email sent successfully via EmailJS!')
          } catch (ejsErr) {
            console.error('⚠️ EmailJS send failed (firm was still created):', ejsErr)
          }
        } else {
          console.warn('⚠️ EmailJS credentials incomplete — email not sent. Please configure Email Settings.')
        }
      } else {
        console.warn('⚠️ No email_payload or emailjs_credentials returned — email not sent.')
      }

      clearSavedState()
      navigate('/superadmin/firms')
    } catch (err) {
      console.error("Creation error:", err)
      const errorMsg = err.response?.data?.error || "An error occurred while creating the CA Firm."
      setErrorMessage(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const renderStepInstructions = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box className="instructions-banner">
            <Typography variant="subtitle2" className="instructions-banner-title">📋 Firm Setup Guide</Typography>
            <div className="instructions-banner-points">
              <span>🔹 <strong>Firm Code:</strong> Use a unique uppercase code (e.g. MEHTACO) for ID prefixing.</span>
              <span>🔹 <strong>Official Email:</strong> Used for billing communications and credentials delivery.</span>
              <span>🔹 <strong>Tax Details:</strong> Check GST &amp; PAN numbers for invoice compliance.</span>
            </div>
          </Box>
        )
      case 1:
        return (
          <Box className="instructions-banner">
            <Typography variant="subtitle2" className="instructions-banner-title">👤 Admin Setup Guide</Typography>
            <div className="instructions-banner-points">
              <span>🔹 <strong>CA Admin Role:</strong> Setup user as CA Admin to manage staff seats.</span>
              <span>🔹 <strong>Activation Links:</strong> Hashed token link bypasses plaintext password entry.</span>
              <span>🔹 <strong>Welcome Dispatch:</strong> Verification link is sent automatically to the administrator.</span>
            </div>
          </Box>
        )
      case 2:
        return (
          <Box className="instructions-banner">
            <Typography variant="subtitle2" className="instructions-banner-title">⚙️ Modules Allocation</Typography>
            <div className="instructions-banner-points">
              <span>🔹 <strong>Application Suite:</strong> Select the cloud software packages to allocate for this tenant.</span>
              <span>🔹 <strong>Portal display:</strong> Selected modules render automatically inside their workspace.</span>
            </div>
          </Box>
        )
      case 3:
        return (
          <Box className="instructions-banner">
            <Typography variant="subtitle2" className="instructions-banner-title">💳 Billing &amp; Validity</Typography>
            <div className="instructions-banner-points">
              <span>🔹 <strong>Plan Tier:</strong> Choose active tiers (Monthly/Yearly/Trial) associated with each module.</span>
              <span>🔹 <strong>Duration:</strong> Subscriptions expire automatically past the designated validity term.</span>
              <span>🔹 <strong>Auto Renew:</strong> Toggle automatic invoicing renewal flags.</span>
            </div>
          </Box>
        )
      case 4:
      default:
        return (
          <Box className="instructions-banner">
            <Typography variant="subtitle2" className="instructions-banner-title">🛡️ Final Pre-Check</Typography>
            <div className="instructions-banner-points">
              <span>🔹 <strong>Atomic Save:</strong> Creation commits firm, admin user, and subscriptions simultaneously.</span>
              <span>🔹 <strong>Verification:</strong> Verify the admin's email address is correct to prevent onboarding failures.</span>
            </div>
          </Box>
        )
    }
  }

  return (
    <Box className="create-firm-container">
      <Box className="create-firm-header" sx={{ mb: 3 }}>
        <Typography variant="h5" className="create-title">
          Establish New CA Firm Gateway
        </Typography>
        <Typography variant="body2" className="create-subtitle">
          Setup firm details, allocate CA Administrator licenses, select active modules, and verify plans.
        </Typography>
      </Box>

      {/* Stepper progress */}
      <Paper elevation={0} className="stepper-paper" sx={{ p: 1.5, mb: 2 }}>
        <Stepper activeStep={activeStep} className="custom-stepper">
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} className="create-alert">
          {errorMessage}
        </Alert>
      )}

      {importSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} className="create-alert" onClose={() => setImportSuccess('')}>
          {importSuccess}
        </Alert>
      )}

      {/* Step Content Rendering */}
      <Paper elevation={0} className="form-content-paper" sx={{ p: 3, mb: 2.5 }}>
        {renderStepInstructions()}
        
        {activeStep === 0 && (
          <Box sx={{ mt: 2 }}>
            {/* Bulk Onboarding upload banner */}
            <Box className="import-banner-container" sx={{ mb: 3, p: 2 }}>
              <div className="import-banner-text">
                <Typography className="import-banner-title">📁 Fast Bulk Onboarding</Typography>
                <Typography className="import-banner-desc">
                  Pre-populate Firm Profile and CA Admin Details. Modules and subscription plans will be configured manually in subsequent steps.
                </Typography>
              </div>
              <div className="import-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <Select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    size="small"
                    className="format-select-dropdown"
                    sx={{ height: '32px', fontSize: '0.74rem' }}
                  >
                    <MenuItem value="csv" sx={{ fontSize: '0.74rem' }}>CSV (.csv)</MenuItem>
                    <MenuItem value="xlsx" sx={{ fontSize: '0.74rem' }}>Excel (.xlsx)</MenuItem>
                    <MenuItem value="xls" sx={{ fontSize: '0.74rem' }}>Excel (.xls)</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download />}
                  onClick={downloadTemplate}
                  className="template-btn"
                  sx={{ height: '32px' }}
                >
                  Download Template
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  component="label"
                  startIcon={<UploadFile />}
                  className="import-btn"
                  sx={{ height: '32px' }}
                >
                  Import Data File
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </Box>

            {/* Identity Group */}
            <Typography className="form-section-divider">🏢 Firm Identity &amp; Structure</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Firm Name *" name="firm_name" fullWidth size="small" value={formData.firm_name} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Firm Code *" name="firm_code" placeholder="e.g. MEHTACO" fullWidth size="small" value={formData.firm_code} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Registration Number" name="registration_number" fullWidth size="small" value={formData.registration_number} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Established Year" name="established_year" type="number" fullWidth size="small" value={formData.established_year} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Business Type</InputLabel>
                  <Select name="business_type" value={formData.business_type} onChange={handleTextChange} label="Business Type">
                    <MenuItem value="Proprietorship">Proprietorship</MenuItem>
                    <MenuItem value="Partnership">Partnership</MenuItem>
                    <MenuItem value="LLP">LLP</MenuItem>
                    <MenuItem value="Private Limited">Private Limited</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Firm Size</InputLabel>
                  <Select name="firm_size" value={formData.firm_size} onChange={handleTextChange} label="Firm Size">
                    <MenuItem value="Small">Small (1-10 staff)</MenuItem>
                    <MenuItem value="Medium">Medium (11-50 staff)</MenuItem>
                    <MenuItem value="Large">Large (50+ staff)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="GST Number" name="gst_number" placeholder="22AAAAA0000A1Z5" fullWidth size="small" value={formData.gst_number} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="PAN Number" name="pan_number" fullWidth size="small" value={formData.pan_number} onChange={handleTextChange} />
              </Grid>
            </Grid>

            {/* Contacts & Address */}
            <Typography className="form-section-divider">📞 Contacts &amp; Communications</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Official Email *" name="email" type="email" fullWidth size="small" value={formData.email} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Mobile Phone *" name="mobile" fullWidth size="small" value={formData.mobile} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField label="Website Link" name="website" placeholder="https://..." fullWidth size="small" value={formData.website} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField label="Office Address Line 1" name="address_line1" fullWidth size="small" value={formData.address_line1} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <TextField label="City" name="city" fullWidth size="small" value={formData.city} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <TextField label="State" name="state" fullWidth size="small" value={formData.state} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <TextField label="Pincode" name="pincode" fullWidth size="small" value={formData.pincode} onChange={handleTextChange} />
              </Grid>
            </Grid>

            {/* Billing Setup */}
            <Typography className="form-section-divider">💳 Billing Coordinates</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField label="Billing Email" name="billing_email" fullWidth size="small" value={formData.billing_email} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Billing Phone" name="billing_phone" fullWidth size="small" value={formData.billing_phone} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Billing Invoice Address" name="billing_address" fullWidth size="small" value={formData.billing_address} onChange={handleTextChange} />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography className="form-section-divider">👤 Primary Administrator Account</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField label="Admin First Name *" name="admin_first_name" fullWidth size="small" value={formData.admin_first_name} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Admin Last Name *" name="admin_last_name" fullWidth size="small" value={formData.admin_last_name} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Admin Designation" name="admin_designation" fullWidth size="small" value={formData.admin_designation} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Admin Corporate Email *" name="admin_email" type="email" placeholder="Used as username" fullWidth size="small" value={formData.admin_email} onChange={handleTextChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Admin Mobile Phone *" name="admin_mobile" fullWidth size="small" value={formData.admin_mobile} onChange={handleTextChange} />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography className="form-section-divider" sx={{ mb: '0 !important' }}>⚙️ Allocate Platform Modules</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Layers />}
                onClick={() => {
                  sessionStorage.setItem('ca_create_form', JSON.stringify(formData))
                  sessionStorage.setItem('ca_create_step', '2')
                  navigate('/superadmin/modules?returnTo=ca-create')
                }}
                sx={{ borderColor: '#2d6a4f', color: '#2d6a4f', borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
              >
                Manage Modules
              </Button>
            </Box>

            {loadingModules ? (
              <Box className="spinner-container"><CircularProgress color="success" /></Box>
            ) : availableModules.length === 0 ? (
              /* ─── EMPTY STATE ─── */
              <Box sx={{
                textAlign: 'center', py: 7, px: 3,
                border: '2px dashed #d8f3dc', borderRadius: '12px',
                background: 'linear-gradient(135deg, #f8fdf9 0%, #f0fdf4 100%)'
              }}>
                <Layers sx={{ fontSize: 64, color: '#b7e4c7', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1b4332', mb: 1 }}>
                  No Modules Available
                </Typography>
                <Typography variant="body2" sx={{ color: '#52796f', mb: 3, maxWidth: 420, mx: 'auto', lineHeight: 1.7 }}>
                  No platform modules have been created yet. Modules are the software packages CA firms subscribe to.
                  Create at least one module first, then come back here to assign it.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => {
                    sessionStorage.setItem('ca_create_form', JSON.stringify(formData))
                    sessionStorage.setItem('ca_create_step', '2')
                    navigate('/superadmin/modules?returnTo=ca-create')
                  }}
                  sx={{
                    backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' },
                    borderRadius: '10px', fontWeight: 700, textTransform: 'none',
                    px: 4, py: 1.2, boxShadow: '0 4px 14px rgba(45,106,79,0.3)'
                  }}
                >
                  Create Modules Now
                </Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#95b8a8' }}>
                  After creating modules, click the back button in the Module Directory to return here
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {availableModules.map((m) => {
                  const isSelected = formData.selectedModuleIds.includes(m.id)
                  const isDisabled = m.status === 'disabled'
                  return (
                    <Grid item xs={12} sm={6} md={4} key={m.id}>
                      <Card
                        className={`module-selection-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && handleModuleToggle(m.id)}
                        sx={{ cursor: isDisabled ? 'not-allowed' : 'pointer', height: '100%',
                          border: isSelected ? '2px solid #2d6a4f' : '2px solid #e8f0eb',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? '0 4px 20px rgba(45,106,79,0.18)' : 'none',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        <CardContent className="module-card-body">
                          <Checkbox checked={isSelected} disabled={isDisabled} color="success" className="module-checkbox" />
                          <div className="module-card-text">
                            <Typography className="module-card-title">{m.display_name}</Typography>
                            <Typography className="module-card-desc">{m.short_description || m.description || 'Cloud tools.'}</Typography>
                            {m.category && (
                              <Chip label={m.category} size="small" sx={{ mb: 0.5, background: '#f0fdf4', color: '#2d6a4f', fontSize: '0.7rem' }} />
                            )}
                            <div className="module-card-plans">
                              {m.plans.length === 0 ? (
                                <Chip label="⚠️ No plans — add plans first" size="small" sx={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.68rem' }} />
                              ) : (
                                m.plans.map(p => (
                                  <Chip key={p.id} label={`${p.plan_name} ₹${p.price}`} size="small" className="plan-pill" />
                                ))
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </Box>
        )}

        {activeStep === 3 && (
          <Box sx={{ mt: 2 }}>
            <Typography className="form-section-divider">💳 Subscription Dates &amp; Billing Rates</Typography>
            {formData.selectedModuleIds.map(mid => {
              const module = availableModules.find(m => m.id === mid)
              const subSetting = formData.subscriptions[mid]
              if (!module) return null

              return (
                <Paper key={mid} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', borderColor: '#e2efe6' }}>
                  <Typography className="sub-config-title" sx={{ mb: 1.5 }}>📦 {module.display_name}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                    {/* Row 1: Full width for Plan to avoid any text cutoff */}
                    <Box sx={{ width: '100%' }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Plan Selection</InputLabel>
                        <Select
                          value={subSetting.plan_id}
                          onChange={(e) => handleSubscriptionChange(mid, 'plan_id', e.target.value)}
                          label="Plan Selection"
                        >
                          {module.plans.map(p => (
                            <MenuItem key={p.id} value={p.id} sx={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                              {p.plan_name} (₹{p.price})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Row 2: Duration and Dates (3 columns) */}
                    <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 11px)' } }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Custom Duration</InputLabel>
                        <Select
                          value={subSetting.duration_override || 'default'}
                          onChange={(e) => handleSubscriptionChange(mid, 'duration_override', e.target.value)}
                          label="Custom Duration"
                        >
                          <MenuItem value="default">Plan Default</MenuItem>
                          <MenuItem value="1">1 Month</MenuItem>
                          <MenuItem value="3">3 Months</MenuItem>
                          <MenuItem value="6">6 Months</MenuItem>
                          <MenuItem value="12">1 Year</MenuItem>
                          <MenuItem value="24">2 Years</MenuItem>
                          <MenuItem value="custom">Custom Date</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 11px)' } }}>
                      <TextField
                        label="Start Date"
                        type="date"
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={subSetting.start_date}
                        onChange={(e) => handleSubscriptionChange(mid, 'start_date', e.target.value)}
                      />
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: 'calc(33.333% - 11px)' } }}>
                      <TextField
                        label="Expiry Date"
                        type="date"
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={subSetting.expiry_date}
                        onChange={(e) => handleSubscriptionChange(mid, 'expiry_date', e.target.value)}
                        disabled={subSetting.duration_override && subSetting.duration_override !== 'custom' && subSetting.duration_override !== 'default'}
                        sx={{ 
                          backgroundColor: (subSetting.duration_override && subSetting.duration_override !== 'custom' && subSetting.duration_override !== 'default') ? '#f3f4f6' : 'transparent',
                          borderRadius: 1
                        }}
                      />
                    </Box>

                    {/* Row 3: Price & Auto-Renew (2 columns) */}
                    <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                      <TextField
                        label="Final Price (INR)"
                        type="number"
                        fullWidth
                        size="small"
                        value={subSetting.price}
                        onChange={(e) => handleSubscriptionChange(mid, 'price', e.target.value)}
                      />
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' }, display: 'flex', alignItems: 'center', pl: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={subSetting.auto_renew}
                            onChange={(e) => handleSubscriptionChange(mid, 'auto_renew', e.target.checked)}
                            color="success"
                          />
                        }
                        label={<Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Enable Auto-Renewal</Typography>}
                      />
                    </Box>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}

        {activeStep === 4 && (
          <Box sx={{ mt: 2 }}>
            <Typography className="form-section-divider">🛡️ Review Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', height: '100%', borderColor: '#e2efe6' }}>
                  <Typography className="review-section-title">🏢 CA Firm Details</Typography>
                  <Divider sx={{ my: 1 }} />
                  <div className="review-box" style={{ background: 'none', border: 'none', padding: 0 }}>
                    <p><strong>Firm Name:</strong> {formData.firm_name} ({formData.firm_code})</p>
                    <p><strong>Official Email:</strong> {formData.email} | <strong>Mobile:</strong> {formData.mobile}</p>
                    <p><strong>City/State:</strong> {formData.city || 'Not set'}, {formData.state || 'Not set'}</p>
                    <p><strong>Established:</strong> {formData.established_year} | <strong>Type:</strong> {formData.business_type}</p>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', height: '100%', borderColor: '#e2efe6' }}>
                  <Typography className="review-section-title">👤 CA Partner Account</Typography>
                  <Divider sx={{ my: 1 }} />
                  <div className="review-box" style={{ background: 'none', border: 'none', padding: 0 }}>
                    <p><strong>Full Name:</strong> {formData.admin_first_name} {formData.admin_last_name}</p>
                    <p><strong>Designation:</strong> {formData.admin_designation}</p>
                    <p><strong>Username/Email:</strong> {formData.admin_email} | <strong>Mobile:</strong> {formData.admin_mobile}</p>
                    <p className="activation-notice">⚠️ Onboarding verification email will dispatch automatically.</p>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', mt: 1, borderColor: '#e2efe6' }}>
                  <Table className="review-modules-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Module Name</TableCell>
                        <TableCell>Subscription Plan</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell align="center">Auto-Renew</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.selectedModuleIds.map(mid => {
                        const module = availableModules.find(m => m.id === mid)
                        const sub = formData.subscriptions[mid]
                        const plan = module?.plans.find(p => p.id === sub.plan_id)
                        return (
                          <TableRow key={mid}>
                            <TableCell className="firm-cell-bold">{module?.display_name}</TableCell>
                            <TableCell>{plan?.plan_name}</TableCell>
                            <TableCell>{sub.start_date}</TableCell>
                            <TableCell>{sub.expiry_date}</TableCell>
                            <TableCell><strong>₹{sub.price}</strong></TableCell>
                            <TableCell align="center">{sub.auto_renew ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Control Buttons */}
      <Box className="stepper-controls">
        <Button
          variant="outlined"
          onClick={activeStep === 0 ? () => navigate('/superadmin/firms') : handleBack}
          startIcon={<ArrowBack />}
          className="stepper-back-btn"
          disabled={submitting}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForward />}
            className="stepper-next-btn"
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Save />}
            className="stepper-create-btn"
            disabled={submitting}
          >
            {submitting ? 'Creating Firm...' : 'Create CA Firm'}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default CAFirmsCreate
