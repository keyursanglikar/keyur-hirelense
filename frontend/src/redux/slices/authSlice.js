// frontend/src/redux/slices/authSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}`

// Login user
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post(`/auth/login/`, credentials)
      const { access, refresh, user, role, is_super_admin } = response.data
      
      sessionStorage.setItem('access_token', access)
      sessionStorage.setItem('refresh_token', refresh)
      sessionStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('role', role)
      
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`
      
      toast.success('Login successful!')
      return { user, role, is_super_admin }
    } catch (error) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Login failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = sessionStorage.getItem('refresh_token')
      if (refreshToken) {
        await api.post(`/auth/logout/`, { refresh: refreshToken })
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('role')
      delete api.defaults.headers.common['Authorization']
      toast.info('Logged out successfully')
    }
  }
)

// Get current user - ADD THIS
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      if (!token) {
        return rejectWithValue('No token found')
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get(`/auth/user/`)
      return response.data
    } catch (error) {
      // If token is invalid, clear everything
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('role')
      delete api.defaults.headers.common['Authorization']
      return rejectWithValue('Session expired')
    }
  }
)

const initialState = {
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  isAuthenticated: !!sessionStorage.getItem('access_token'),
  role: sessionStorage.getItem('role') || null,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      sessionStorage.setItem('user', JSON.stringify(state.user))
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.role = action.payload.role
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.role = null
        state.error = action.payload
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.role = null
        state.error = null
      })
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload
        state.role = action.payload.role
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.role = null
      })
  },
})

export const { clearError, updateUser } = authSlice.actions
export default authSlice.reducer