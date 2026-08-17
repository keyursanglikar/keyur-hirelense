// frontend/src/redux/slices/moduleSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}`

// Async thunks
export const fetchModules = createAsyncThunk(
  'module/fetchModules',
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.get(`/modules/`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch modules')
    }
  }
)

export const fetchFirmModules = createAsyncThunk(
  'module/fetchFirmModules',
  async (firmId, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.get(`/firms/${firmId}/modules/`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch firm modules')
    }
  }
)

export const assignModule = createAsyncThunk(
  'module/assignModule',
  async ({ firmId, moduleData }, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await api.post(`/firms/${firmId}/modules/`, moduleData)
      toast.success('Module assigned successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign module'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  modules: [],
  firmModules: [],
  currentModule: null,
  loading: false,
  error: null
}

const moduleSlice = createSlice({
  name: 'module',
  initialState,
  reducers: {
    clearModuleError: (state) => {
      state.error = null
    },
    setCurrentModule: (state, action) => {
      state.currentModule = action.payload
    },
    clearCurrentModule: (state) => {
      state.currentModule = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch modules
      .addCase(fetchModules.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.loading = false
        state.modules = action.payload.results || action.payload
      })
      .addCase(fetchModules.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch firm modules
      .addCase(fetchFirmModules.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFirmModules.fulfilled, (state, action) => {
        state.loading = false
        state.firmModules = action.payload.results || action.payload
      })
      .addCase(fetchFirmModules.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Assign module
      .addCase(assignModule.fulfilled, (state, action) => {
        state.firmModules.push(action.payload)
      })
  }
})

export const { clearModuleError, setCurrentModule, clearCurrentModule } = moduleSlice.actions
export default moduleSlice.reducer