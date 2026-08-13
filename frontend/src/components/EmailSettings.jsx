// frontend/src/components/EmailSettings.jsx

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Tooltip
} from '@mui/material'
import {
  Save,
  Email,
  VpnKey,
  Launch,
  CheckCircle,
  Refresh
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import emailjs from '@emailjs/browser'
import axios from 'axios'
import './EmailSettings.css'

const SYSTEM_ONBOARDING_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f5; margin: 0; padding: 20px; }
    .email-container { max-width: 620px; background: #ffffff; margin: 0 auto; border-radius: 12px; border: 1px solid #e2efe6; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 13px; color: #b7e4c7; }
    .content { padding: 32px 28px; line-height: 1.7; color: #333333; }
    .welcome-text { font-size: 18px; color: #1b4332; font-weight: 700; margin-top: 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #fafdfb; border-radius: 8px; border: 1px solid #e8f0eb; overflow: hidden; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #e8f0eb; font-size: 14px; }
    .details-table tr:last-child td { border-bottom: none; }
    .details-table td strong { color: #2d6a4f; }
    .section-title { font-size: 15px; font-weight: 700; color: #1b4332; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #d8f3dc; }
    .button-container { text-align: center; margin: 28px 0; }
    .activate-button { background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 14px rgba(45,106,79,0.3); letter-spacing: 0.3px; }
    .footer { background: #f8fdf9; text-align: center; padding: 20px; font-size: 12px; color: #7f9f8c; border-top: 1px solid #e8f0eb; }
    .note-box { background: #fffbf0; border-left: 4px solid #f6c90e; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #7d6008; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>&#127381; Welcome to NZSolution</h1>
      <p>CA Firm Onboarding &amp; Module Access</p>
    </div>
    <div class="content">
      <p class="welcome-text">Dear {{to_name}},</p>
      <p>Your CA Firm has been successfully registered on the <strong>NZSolution SaaS Portal</strong>. Your administrative credentials and module subscriptions are now active.</p>

      <p class="section-title">&#127970; Firm &amp; Account Details</p>
      <table class="details-table">
        <tr>
          <td><strong>Firm Name:</strong></td>
          <td>{{firm_name}}</td>
        </tr>
        <tr>
          <td><strong>Firm Code:</strong></td>
          <td>{{firm_code}}</td>
        </tr>
        <tr>
          <td><strong>Admin Login (Email):</strong></td>
          <td>{{to_email}}</td>
        </tr>
      </table>

      <p class="section-title">&#128274; Purchased Modules &amp; Access Links</p>
      <p style="font-size:13px; color:#555; margin-bottom:14px;">The following modules have been assigned to your firm. Click the <strong>"Access [Module]"</strong> button for each module to open it directly. These links are accessible only with your activated account.</p>

      {{modules_links}}

      <div class="note-box">
        &#9888;&nbsp; Module links will redirect you to the login page until your account is activated. Please activate your account first using the button below.
      </div>

      <p class="section-title">&#128272; Activate Your Account</p>
      <p>To set your secure password and access all modules, click the activation button below. This link expires in <strong>24 hours</strong>.</p>

      <div class="button-container">
        <a href="{{activation_link}}" class="activate-button">&#9989; Activate CA Account</a>
      </div>

      <p style="font-size: 12px; color: #888; text-align:center;">If the button does not work, copy and paste this link into your browser:<br>
        <a href="{{activation_link}}" style="color:#2d6a4f; word-break:break-all;">{{activation_link}}</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 NZSolution SaaS Gateway. All rights reserved.</p>
      <p>This is an automated operational notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

const FIRM_CLIENT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f5; margin: 0; padding: 20px; }
    .email-container { max-width: 600px; background: #ffffff; margin: 0 auto; border-radius: 12px; border: 1px solid #e2efe6; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 25px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .content { padding: 30px 25px; line-height: 1.6; color: #333333; }
    .welcome-text { font-size: 16px; color: #1b4332; font-weight: 700; margin-top: 0; }
    .message-box { background: #fafdfb; border-left: 4px solid #2d6a4f; padding: 20px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #333333; line-height: 1.6; }
    .footer { background: #fafdfb; text-align: center; padding: 20px; font-size: 12px; color: #7f9f8c; border-top: 1px solid #e8f0eb; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Secure Client Notice</h1>
    </div>
    <div class="content">
      <p class="welcome-text">Dear {{to_name}},</p>
      <p>You have received a new administrative update regarding your account from <strong>{{firm_name}}</strong>:</p>
      
      <div class="message-box">
        {{message}}
      </div>

      <p>If you need further clarification, please log in to your Client Portal or reply to your CA consultant at {{to_email}}.</p>
    </div>
    <div class="footer">
      <p>Sent securely on behalf of {{firm_name}}.</p>
      <p>&copy; 2026 NZSolution SaaS Gateway. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

const EmailSettings = ({ type, onSaveSuccess }) => {
  const { user } = useSelector((state) => state.auth)

  const [activeStep, setActiveStep] = useState(0)
  const [serviceId, setServiceId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const endpoint = type === 'system' 
    ? 'http://localhost:8000/api/firms/system-email-settings/' 
    : 'http://localhost:8000/api/firms/email-settings/'

  const handleCopyHTML = () => {
    const templateText = type === 'system' ? SYSTEM_ONBOARDING_HTML_TEMPLATE : FIRM_CLIENT_HTML_TEMPLATE
    navigator.clipboard.writeText(templateText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    fetchSettings()
  }, [type])

  const fetchSettings = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setServiceId(res.data.service_id || '')
      setTemplateId(res.data.template_id || '')
      setPublicKey(res.data.public_key || '')
      
      // Auto advance step if fields are already filled in
      if (res.data.service_id && res.data.template_id && res.data.public_key) {
        setActiveStep(4)
      }
    } catch (err) {
      console.error("Failed to load settings:", err)
      setErrorMsg("Failed to load email settings from the server.")
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!serviceId || !templateId || !publicKey) {
      setErrorMsg("Please complete all credentials steps before testing connection.")
      return
    }

    const recipientEmail = user?.email
    if (!recipientEmail) {
      setErrorMsg("Cannot determine your email address. Please refresh and try again.")
      return
    }

    setTesting(true)
    setErrorMsg('')
    setTestSuccess(false)

    // Sample modules HTML for realistic test email preview
    const sampleModulesHtml = `<div style="border:1px solid #e8f0eb; border-radius:8px; padding:14px 16px; margin-bottom:10px; background:#fafdfb;">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
    <span style="font-weight:700; color:#1b4332; font-size:14px;">Fee Estimation</span>
    <span style="font-size:11px; font-weight:600; color:#2d6a4f; background:#2d6a4f1a; padding:2px 8px; border-radius:20px;">Active</span>
  </div>
  <table style="width:100%; font-size:12px; color:#555; border-collapse:collapse;">
    <tr><td style="padding:2px 0; width:40%;"><strong>Plan:</strong></td><td>Yearly Professional</td></tr>
    <tr><td style="padding:2px 0;"><strong>Valid From:</strong></td><td>2026-08-01</td></tr>
    <tr><td style="padding:2px 0;"><strong>Valid Until:</strong></td><td>2027-07-31</td></tr>
    <tr><td style="padding:2px 0;"><strong>Duration:</strong></td><td>365 days</td></tr>
    <tr><td style="padding:2px 0;"><strong>Renewal:</strong></td><td>Yes (Auto-Renew)</td></tr>
  </table>
  <div style="margin-top:10px;">
    <a href="${window.location.origin}/ca/fee-estimation" style="display:inline-block; background:#2d6a4f; color:#fff !important; padding:7px 18px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none;">Access Fee Estimation &rarr;</a>
    <span style="margin-left:10px; font-size:11px; color:#888;">${window.location.origin}/ca/fee-estimation</span>
  </div>
</div>`

    try {
      const testParams = type === 'system' ? {
        to_name: `${user?.first_name || 'System'} ${user?.last_name || 'Admin'}`,
        to_email: recipientEmail,
        firm_name: "NZSolution Test Firm",
        firm_code: "TESTCODE",
        activation_link: `${window.location.origin}/ca/activate?token=test_token`,
        modules_links: sampleModulesHtml
      } : {
        to_name: `${user?.first_name || 'CA'} ${user?.last_name || 'Admin'}`,
        to_email: recipientEmail,
        firm_name: "Your CA Office",
        message: "This is a secure system verification email from your CA firm portal."
      }

      await emailjs.send(serviceId, templateId, testParams, publicKey)
      setTestSuccess(true)
      setSuccessMsg(`✅ Test email sent to ${recipientEmail}! Please check your inbox.`)
    } catch (err) {
      console.error("Connection test failed:", err)
      setErrorMsg(`Verification failed: ${err.text || err.message || "Invalid EmailJS credentials."}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const token = sessionStorage.getItem('access_token')
      await axios.post(endpoint, {
        service_id: serviceId,
        template_id: templateId,
        public_key: publicKey
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccessMsg("Email configurations securely saved to database!")
      if (onSaveSuccess) {
        setTimeout(onSaveSuccess, 1500)
      }
    } catch (err) {
      console.error("Failed to save settings:", err)
      setErrorMsg(err.response?.data?.error || "Failed to save email settings.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
        <CircularProgress color="success" />
      </Box>
    )
  }

  const onboardingSteps = [
    'Register on EmailJS',
    'Add Email Service',
    'Define Template',
    'Save API Keys',
    'Verify Connection'
  ]

  return (
    <Box className="email-settings-card" sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b4332', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Email sx={{ color: '#2d6a4f' }} /> 
        {type === 'system' ? 'SuperAdmin Onboarding Email setup' : 'CA Client Notifications Setup'}
      </Typography>
      <Typography variant="body2" sx={{ color: '#52796f', mb: 3.5 }}>
        Walk through the guided steps below to connect your dynamic EmailJS service and verify email sending.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }} className="onboarding-stepper">
        {onboardingSteps.map((label, index) => (
          <Step key={label} onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>
            <StepLabel 
              StepIconProps={{
                style: { color: activeStep >= index ? '#2d6a4f' : '#adc1b6' }
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: activeStep === index ? 700 : 500 }}>
                {label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Divider sx={{ mb: 3.5, borderColor: '#e8f0eb' }} />

      {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle sx={{ color: '#2e7d32' }} />}>{successMsg}</Alert>}

      {/* STEP 1: REGISTER */}
      {activeStep === 0 && (
        <Box className="guide-section active">
          <div className="guide-header">
            <span className="guide-badge">1</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b4332' }}>
              Create a Free EmailJS Account
            </Typography>
          </div>

          <Typography variant="body2" sx={{ color: '#52796f', mb: 1.5 }}>
            EmailJS lets you send transactional emails <strong>directly from this software</strong> without any backend mail server. The free plan includes <strong>200 emails/month</strong> — enough for most CA firms.
          </Typography>

          <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>📋 Step-by-step:</Typography>
            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 2 }}>
              1️⃣ &nbsp;Click <strong>"Register on EmailJS.com"</strong> below — it opens in a new tab.<br />
              2️⃣ &nbsp;Fill in your <strong>Name</strong>, <strong>Email</strong>, and <strong>Password</strong> on the sign-up form.<br />
              3️⃣ &nbsp;Check your inbox and click the <strong>verification link</strong> sent by EmailJS.<br />
              4️⃣ &nbsp;Log in to your new EmailJS dashboard.<br />
              5️⃣ &nbsp;Come back here and click <strong>Next Step</strong>.
            </Typography>
          </Box>

          <Box sx={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', p: 1.5, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#92400e', fontSize: '0.8rem' }}>
              ⚠️ <strong>Important:</strong> Use the same email address as your NZSolution login ({user?.email}) for easier identification. Each SuperAdmin/CA Firm needs their own separate EmailJS account.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Launch />}
            href="https://dashboard.emailjs.com/sign-up"
            target="_blank"
            className="external-link-btn"
            sx={{ mb: 2 }}
          >
            🚀 Register on EmailJS.com (Free)
          </Button>

          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="small" onClick={() => setActiveStep(1)} sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' } }}>
              ✓ Account Created — Next Step
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 2: SERVICE ID */}
      {activeStep === 1 && (
        <Box className="guide-section active">
          <div className="guide-header">
            <span className="guide-badge">2</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b4332' }}>
              Connect Your Email Account (Gmail / Outlook)
            </Typography>
          </div>

          <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>📋 Step-by-step:</Typography>
            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 2 }}>
              1️⃣ &nbsp;In your EmailJS dashboard, click <strong>"Email Services"</strong> in the left sidebar.<br />
              2️⃣ &nbsp;Click the <strong>"Add New Service"</strong> button (top right).<br />
              3️⃣ &nbsp;Choose your email provider — select <strong>Gmail</strong> for Google accounts or <strong>Outlook</strong> for Microsoft.<br />
              4️⃣ &nbsp;Click <strong>"Connect Account"</strong> and sign in to your email account to grant access.<br />
              5️⃣ &nbsp;Give your service a name (e.g. <em>NZSolution Mailer</em>) and click <strong>"Create Service"</strong>.<br />
              6️⃣ &nbsp;You will see a <strong>Service ID</strong> like <code>service_znilmng</code> — copy it and paste below.
            </Typography>
          </Box>

          <Box sx={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', p: 1.5, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#92400e', fontSize: '0.8rem' }}>
              ⚠️ <strong>Gmail users:</strong> If you see a Google security warning, click <strong>"Advanced" → "Go to EmailJS (unsafe)"</strong> to allow access. This is safe — EmailJS is a verified service.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Launch />}
            href="https://dashboard.emailjs.com/admin"
            target="_blank"
            className="external-link-btn"
            sx={{ mb: 2 }}
          >
            Open EmailJS Dashboard → Email Services
          </Button>

          <TextField
            label="EmailJS Service ID"
            placeholder="e.g. service_znilmng"
            fullWidth
            required
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            size="small"
            sx={{ mt: 1, backgroundColor: '#ffffff' }}
            helperText="Found in EmailJS → Email Services → click your service → Service ID is shown at the top"
          />
          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="text" size="small" onClick={() => setActiveStep(0)} sx={{ color: '#52796f' }}>← Back</Button>
            <Button variant="contained" size="small" onClick={() => setActiveStep(2)} disabled={!serviceId.trim()} sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' } }}>
              Next Step →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 3: TEMPLATE ID */}
      {activeStep === 2 && (
        <Box className="guide-section active">
          <div className="guide-header">
            <span className="guide-badge">3</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b4332' }}>
              Create Email Template &amp; Configure Variables
            </Typography>
          </div>

          {/* Part A: Create template */}
          <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>📋 Part A — Create the Template:</Typography>
            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 2 }}>
              1️⃣ &nbsp;In EmailJS dashboard, click <strong>"Email Templates"</strong> in the left sidebar.<br />
              2️⃣ &nbsp;Click <strong>"Create New Template"</strong> (top right button).<br />
              3️⃣ &nbsp;You will see a template editor with Subject and Body fields.
            </Typography>
          </Box>

          {/* Part B: Set To Email field — CRITICAL */}
          <Box sx={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#991b1b', mb: 1 }}>🔴 Part B — CRITICAL: Set the "To Email" field</Typography>
            <Typography variant="body2" sx={{ color: '#7f1d1d', lineHeight: 2 }}>
              This is the most common setup mistake. Without this, emails will fail with <em>"recipients address is empty"</em>.<br />
              1️⃣ &nbsp;In the template editor, look at the top section — find the <strong>"To Email"</strong> input box.<br />
              2️⃣ &nbsp;Type exactly: <code style={{background:'#fff', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>{'{{to_email}}'}</code><br />
              3️⃣ &nbsp;In the <strong>"To Name"</strong> field, type: <code style={{background:'#fff', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>{'{{to_name}}'}</code><br />
              4️⃣ &nbsp;Set <strong>Subject</strong> to: <code style={{background:'#fff', padding:'2px 6px', borderRadius:'4px'}}>Welcome to NZSolution — Activate Your CA Account</code>
            </Typography>
          </Box>

          {/* Part C: Paste HTML */}
          <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>📋 Part C — Paste the HTML Template Body:</Typography>
            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 2 }}>
              1️⃣ &nbsp;In the template body editor, look for a <strong>"{'< >'} "</strong> or <strong>"HTML"</strong> or <strong>"Source"</strong> button — click it to switch to HTML mode.<br />
              2️⃣ &nbsp;Press <strong>Ctrl+A</strong> to select all existing content, then delete it.<br />
              3️⃣ &nbsp;Click <strong>"Copy HTML Template"</strong> below to copy our pre-built template.<br />
              4️⃣ &nbsp;Paste it into the HTML editor (<strong>Ctrl+V</strong>).<br />
              5️⃣ &nbsp;Click <strong>"Save"</strong> in EmailJS.
            </Typography>
          </Box>

          {/* Variable Reference */}
          <Typography variant="body2" sx={{ color: '#1b4332', fontWeight: 700, mb: 0.5 }}>📌 Template Variables Reference:</Typography>
          <Typography variant="body2" sx={{ color: '#52796f', mb: 1, fontSize: '0.8rem' }}>These variables are auto-filled by NZSolution when sending each email — do not hardcode them.</Typography>
          <div className="variable-tag-box">
            {type === 'system' ? (
              <>
                <span><span className="variable-tag">{"{{to_name}}"}</span>: CA Admin's full name</span>
                <span><span className="variable-tag">{"{{to_email}}"}</span>: Admin login email — used as recipient address ⬅ set in "To Email" field</span>
                <span><span className="variable-tag">{"{{firm_name}}"}</span>: New CA Firm name</span>
                <span><span className="variable-tag">{"{{firm_code}}"}</span>: Unique Firm Code</span>
                <span><span className="variable-tag">{"{{activation_link}}"}</span>: Secure 24hr account activation URL</span>
                <span><span className="variable-tag">{"{{modules_links}}"}</span>: Auto HTML cards — module name, plan, validity, "Access →" button per module</span>
              </>
            ) : (
              <>
                <span><span className="variable-tag">{"{{to_name}}"}</span>: Client's full name</span>
                <span><span className="variable-tag">{"{{to_email}}"}</span>: Client's email — used as recipient address ⬅ set in "To Email" field</span>
                <span><span className="variable-tag">{"{{firm_name}}"}</span>: Your CA Firm name</span>
                <span><span className="variable-tag">{"{{message}}"}</span>: Secure notice body content</span>
              </>
            )}
          </div>

          {/* HTML Template copy area */}
          <Typography variant="body2" sx={{ color: '#1b4332', fontWeight: 700, mt: 2.5, mb: 1 }}>📄 Pre-built HTML Template — Copy &amp; Paste into EmailJS:</Typography>
          <textarea
            readOnly
            className="html-code-textarea"
            value={type === 'system' ? SYSTEM_ONBOARDING_HTML_TEMPLATE : FIRM_CLIENT_HTML_TEMPLATE}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={handleCopyHTML}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              borderColor: copied ? '#2d6a4f' : '#adc1b6',
              color: copied ? '#2d6a4f' : '#52796f',
              backgroundColor: copied ? '#f4faf6' : 'transparent',
              '&:hover': { borderColor: '#1b4332', backgroundColor: '#f4faf6' },
              mb: 2.5
            }}
          >
            {copied ? '✓ HTML Template Copied!' : '📋 Copy HTML Template'}
          </Button>

          <Button
            variant="text"
            size="small"
            startIcon={<Launch />}
            href="https://dashboard.emailjs.com/admin/templates"
            target="_blank"
            sx={{ color: '#2d6a4f', textTransform: 'none', mb: 2, display: 'block' }}
          >
            Open EmailJS → Email Templates
          </Button>

          <Typography variant="body2" sx={{ color: '#52796f', mb: 1 }}>
            ✅ After saving the template in EmailJS, copy the <strong>Template ID</strong> (shown at the top of the template, e.g. <code>template_c9814fl</code>) and paste it here:
          </Typography>

          <TextField
            label="EmailJS Template ID"
            placeholder="e.g. template_c9814fl"
            fullWidth
            required
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            size="small"
            sx={{ mt: 1, backgroundColor: '#ffffff' }}
            helperText="Found in EmailJS → Email Templates → click your template → Template ID is shown at the top"
          />
          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="text" size="small" onClick={() => setActiveStep(1)} sx={{ color: '#52796f' }}>← Back</Button>
            <Button variant="contained" size="small" onClick={() => setActiveStep(3)} disabled={!templateId.trim()} sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' } }}>
              Next Step →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 4: PUBLIC KEY */}
      {activeStep === 3 && (
        <Box className="guide-section active">
          <div className="guide-header">
            <span className="guide-badge">4</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b4332' }}>
              Copy Your EmailJS Public Key (API Key)
            </Typography>
          </div>

          <Box sx={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>📋 Step-by-step:</Typography>
            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 2 }}>
              1️⃣ &nbsp;In the EmailJS dashboard, click <strong>"Account"</strong> in the left sidebar (bottom of the menu).<br />
              2️⃣ &nbsp;Click the <strong>"API Keys"</strong> tab at the top of the Account page.<br />
              3️⃣ &nbsp;You will see a <strong>"Public Key"</strong> section — it looks like a random string (e.g. <code>aBcD1234xyzWPWi</code>).<br />
              4️⃣ &nbsp;Click <strong>"Copy"</strong> next to the Public Key, then paste it in the field below.<br />
            </Typography>
          </Box>

          <Box sx={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', p: 1.5, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#92400e', fontSize: '0.8rem' }}>
              ⚠️ <strong>Do NOT use the Private Key</strong> here — only the <strong>Public Key</strong> is safe to use in browser-side code. The Private Key should never be shared or entered here.
            </Typography>
          </Box>

          <Button
            variant="text"
            size="small"
            startIcon={<Launch />}
            href="https://dashboard.emailjs.com/admin/account/security"
            target="_blank"
            sx={{ color: '#2d6a4f', textTransform: 'none', mb: 2, display: 'block' }}
          >
            Open EmailJS → Account → API Keys
          </Button>

          <TextField
            label="EmailJS Public Key"
            placeholder="e.g. aBcD1234xyzWPWi"
            fullWidth
            required
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            size="small"
            sx={{ mt: 1, backgroundColor: '#ffffff' }}
            helperText="Found in EmailJS → Account → API Keys → Public Key"
            InputProps={{
              startAdornment: <VpnKey sx={{ mr: 1, color: '#adc1b6', fontSize: '1.1rem' }} />
            }}
          />
          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="text" size="small" onClick={() => setActiveStep(2)} sx={{ color: '#52796f' }}>← Back</Button>
            <Button variant="contained" size="small" onClick={() => setActiveStep(4)} disabled={!publicKey.trim()} sx={{ backgroundColor: '#2d6a4f', '&:hover': { backgroundColor: '#1b4332' } }}>
              Verify &amp; Save →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 5: VERIFY & SAVE */}
      {activeStep === 4 && (
        <Box className="guide-section active" sx={{ border: '1px solid #e2efe6' }}>
          <div className="guide-header">
            <span className="guide-badge">5</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b4332' }}>
              Verify &amp; Save Configurations
            </Typography>
          </div>
          <Typography variant="body2" sx={{ color: '#52796f', mb: 3 }}>
            All credentials set! Before saving them permanently to your database, click **Test Connection** to trigger a test dispatch directly to your inbox (<strong>{user?.email}</strong>) using your credentials.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#52796f' }}>Service ID</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.86rem', color: '#1b4332' }}>{serviceId || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#52796f' }}>Template ID</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.86rem', color: '#1b4332' }}>{templateId || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#52796f' }}>Public Key</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.86rem', color: '#1b4332' }}>{publicKey ? `••••${publicKey.slice(-4)}` : '—'}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5, borderColor: '#e8f0eb' }} />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="success"
              disabled={testing || submitting}
              startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
              onClick={handleTestConnection}
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, borderColor: '#2d6a4f', color: '#2d6a4f', '&:hover': { borderColor: '#1b4332', backgroundColor: '#f4faf6' } }}
            >
              {testing ? 'Verifying...' : 'Test Connection'}
            </Button>

            <Button
              variant="contained"
              disabled={submitting || testing || (!testSuccess && !submitting)}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave}
              sx={{ 
                textTransform: 'none', 
                borderRadius: '8px', 
                fontWeight: 600, 
                backgroundColor: testSuccess ? '#2d6a4f' : '#adc1b6', 
                '&:hover': { backgroundColor: '#1b4332' } 
              }}
            >
              {submitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>

          {!testSuccess && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#e07a5f' }}>
              ⚠️ You must successfully complete the connection test before you can save the settings to the database.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export default EmailSettings
