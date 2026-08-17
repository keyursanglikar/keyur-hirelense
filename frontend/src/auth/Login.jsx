// frontend/src/components/Login.jsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
} from '@mui/icons-material'
import { loginUser } from '../redux/slices/authSlice'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await dispatch(loginUser(formData)).unwrap()
      
      if (result.is_super_admin) {
        navigate('/superadmin/dashboard')
      } else if (result.role === 'firm_admin') {
        navigate('/firm/dashboard')
      } else {
        navigate('/staff/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Background abstract shapes for unique design aesthetics */}
      <div className="glass-blob blob-1"></div>
      <div className="glass-blob blob-2"></div>
      <div className="glass-blob blob-3"></div>

      <Container component="main" maxWidth="xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Paper elevation={0} className="login-paper">
            <Box className="login-header">
              <div className="modern-logo-wrapper">
                <motion.div
                  className="logo-ring"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                />
                <motion.div
                  className="logo-ring-inner"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                />
                <div className="logo-text">NZ</div>
              </div>
              <h1 className="modern-title" style={{ marginTop: '20px', marginBottom: '20px' }}>
                <span className="gradient-text">Nzsolutions</span>
                <span className="gradient-text-alt" style={{ marginLeft: '8px' }}>CA Superadmin</span>
              </h1>
            </Box>

            <form onSubmit={handleSubmit}>
              <FormControl variant="outlined" margin="dense" required fullWidth>
                <InputLabel htmlFor="email">Email Address</InputLabel>
                <OutlinedInput
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  label="Email Address"
                  startAdornment={
                    <InputAdornment position="start">
                      <Email color="primary" />
                    </InputAdornment>
                  }
                />
              </FormControl>

              <FormControl variant="outlined" margin="dense" required fullWidth sx={{ mt: 2 }}>
                <InputLabel htmlFor="password">Password</InputLabel>
                <OutlinedInput
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  label="Password"
                  startAdornment={
                    <InputAdornment position="start">
                      <Lock color="primary" />
                    </InputAdornment>
                  }
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#2d6a4f', zIndex: 10, display: 'flex' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
              </FormControl>

              {error && (
                <Alert severity="error" className="login-error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Secure Login'}
              </Button>

              <Box className="login-footer">
                <Typography variant="body2" className="footer-text">
                  © 2026 NZSolution. All rights reserved.
                </Typography>
                <Typography variant="body2" className="footer-version">
                  Enterprise CA Edition • v2.0.6
                </Typography>
              </Box>
            </form>
          </Paper>
        </motion.div>
      </Container>
    </div>
  )
}

export default Login