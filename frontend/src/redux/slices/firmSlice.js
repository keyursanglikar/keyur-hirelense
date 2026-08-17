// frontend/src/redux/slices/firmSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}`

// Async thunks
export const fetchFirms = createAsyncThunk(
  'firm/fetchFirms',
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.get(`/firms/`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch firms')
    }
  }
)

export const createFirm = createAsyncThunk(
  'firm/createFirm',
  async (firmData, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.post(`/firms/`, firmData)
      toast.success('Firm created successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create firm'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const updateFirm = createAsyncThunk(
  'firm/updateFirm',
  async ({ id, firmData }, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.put(`/firms/${id}/`, firmData)
      toast.success('Firm updated successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update firm'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

export const deleteFirm = createAsyncThunk(
  'firm/deleteFirm',
  async (id, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      await api.delete(`/firms/${id}/`)
      toast.success('Firm deleted successfully!')
      return id
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete firm'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  firms: [],
  currentFirm: null,
  loading: false,
  error: null,
  total: 0
}

const firmSlice = createSlice({
  name: 'firm',
  initialState,
  reducers: {
    clearFirmError: (state) => {
      state.error = null
    },
    setCurrentFirm: (state, action) => {
      state.currentFirm = action.payload
    },
    clearCurrentFirm: (state) => {
      state.currentFirm = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch firms
      .addCase(fetchFirms.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFirms.fulfilled, (state, action) => {
        state.loading = false
        state.firms = action.payload.results || action.payload
        state.total = action.payload.count || action.payload.length || 0
      })
      .addCase(fetchFirms.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create firm
      .addCase(createFirm.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createFirm.fulfilled, (state, action) => {
        state.loading = false
        state.firms.unshift(action.payload)
      })
      .addCase(createFirm.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update firm
      .addCase(updateFirm.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateFirm.fulfilled, (state, action) => {
        state.loading = false
        const index = state.firms.findIndex(firm => firm.id === action.payload.id)
        if (index !== -1) {
          state.firms[index] = action.payload
        }
        if (state.currentFirm?.id === action.payload.id) {
          state.currentFirm = action.payload
        }
      })
      .addCase(updateFirm.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Delete firm
      .addCase(deleteFirm.fulfilled, (state, action) => {
        state.firms = state.firms.filter(firm => firm.id !== action.payload)
        if (state.currentFirm?.id === action.payload) {
          state.currentFirm = null
        }
      })
  }
})

export const { clearFirmError, setCurrentFirm, clearCurrentFirm } = firmSlice.actions
export default firmSlice.reducer