// frontend/src/components/ActivateAccount.jsx

import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Container,
  CircularProgress
} from '@mui/material'
import {
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircleOutlined,
  Email,
  ArrowForward
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import axios from 'axios'
import './ActivateAccount.css'

const ActivateAccount = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!password || !confirmPassword) {
      setErrorMessage("Please fill all password fields.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.")
      return
    }

    if (!token || !email) {
      setErrorMessage("Invalid or missing activation parameters.")
      return
    }

    setLoading(true)

    try {
      await axios.post('http://localhost:8000/api/firms/activate/', {
        token,
        email,
        password
      })
      setSuccess(true)
    } catch (err) {
      console.error("Activation failed:", err)
      setErrorMessage(err.response?.data?.error || "Account activation failed. The token may be expired or invalid.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="activation-page">
      {/* Visual glowing blobs matching login aesthetics */}
      <div className="glass-blob blob-1"></div>
      <div className="glass-blob blob-2"></div>
      
      <Container component="main" maxWidth="xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Paper elevation={0} className="activation-paper">
            {/* Logo area */}
            <Box className="activation-header">
              <svg className="activation-logo" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="act-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2d6a4f" />
                    <stop offset="100%" stopColor="#52b788" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#act-grad)" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6"/>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#f0f5f1" strokeWidth="6" />
                <circle cx="60" cy="60" r="43" fill="#ffffff" />
                <g transform="translate(10, 10)">
                  <path d="M 75 35 A 25 25 0 1 0 75 65" fill="none" stroke="#2d6a4f" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 40 70 L 60 30 L 80 70" fill="none" stroke="#52b788" strokeWidth="5" strokeLinecap="round" />
                  <path d="M 48 56 L 72 56" fill="none" stroke="#52b788" strokeWidth="4" strokeLinecap="round" />
                  <text x="60" y="94" textAnchor="middle" fill="#1b4332" fontSize="13" fontWeight="800" letterSpacing="1">
                    NZ-CA
                  </text>
                </g>
              </svg>
              <Typography component="h1" variant="h5" className="activation-title">
                Activate CA Gateway
              </Typography>
              <Typography variant="body2" className="activation-subtitle">
                Set a secure password for your administrator account.
              </Typography>
            </Box>

            {success ? (
              <Box className="success-container">
                <CheckCircleOutlined className="success-icon" />
                <Typography variant="h6" className="success-title">Account Activated!</Typography>
                <Typography variant="body2" className="success-desc">
                  Your CA administrator account is now active and ready. Click below to proceed to the secure login gateway.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login')}
                  className="login-redirect-btn"
                  endIcon={<ArrowForward />}
                >
                  Proceed to Login
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                {errorMessage && (
                  <Alert severity="error" className="activation-error" sx={{ mb: 2 }}>
                    {errorMessage}
                  </Alert>
                )}

                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  label="Email Address (Username)"
                  value={email || ''}
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="disabled" />
                      </InputAdornment>
                    ),
                  }}
                  className="disabled-field"
                  sx={{ mb: 2 }}
                />

                <TextField
                  variant="outlined"
                  margin="dense"
                  required
                  fullWidth
                  name="password"
                  label="Configure Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  variant="outlined"
                  margin="dense"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  className="activate-submit-btn"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Set Password & Activate'}
                </Button>
              </form>
            )}

            <Box className="activation-footer">
              <Typography variant="body2" className="footer-text">
                © 2026 NZSolution. All rights reserved.
              </Typography>
              <Typography variant="body2" className="footer-version">
                Enterprise CA Edition • v2.0.6
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </div>
  )
}

export default ActivateAccount
