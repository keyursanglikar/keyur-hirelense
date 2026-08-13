// frontend/src/components/CAFirmsList.jsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material'
import {
  Search,
  Add,
  Business,
  Visibility,
  CheckCircle,
  RemoveCircle,
  HelpOutlined
} from '@mui/icons-material'
import axios from 'axios'
import './CAFirmsList.css'

const CAFirmsList = () => {
  const navigate = useNavigate()
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchFirms()
  }, [])

  const fetchFirms = async () => {
    try {
      const token = sessionStorage.getItem('access_token')
      const res = await axios.get('http://localhost:8000/api/firms/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFirms(res.data)
    } catch (err) {
      console.error("Failed to fetch firms:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredFirms = firms.filter(
    (f) =>
      f.firm_name.toLowerCase().includes(search.toLowerCase()) ||
      f.firm_code.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusChipClass = (status) => {
    switch (status) {
      case 'active':
        return 'chip-active'
      case 'suspended':
        return 'chip-suspended'
      case 'inactive':
      default:
        return 'chip-inactive'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="chip-icon" />
      case 'suspended':
        return <RemoveCircle className="chip-icon" />
      default:
        return <HelpOutlined className="chip-icon" />
    }
  }

  return (
    <Box className="firms-list-content">
      <Box className="firms-list-header" sx={{ mb: 3 }}>
        <div>
          <Typography variant="h5" className="firms-title">
            Manage Registered CA Firms
          </Typography>
          <Typography variant="body2" className="firms-subtitle">
            Create CA firms, issue licenses, allocate subscriptions, and audit portal access.
          </Typography>
        </div>
        <Button
          variant="contained"
          className="create-firm-btn"
          startIcon={<Add />}
          onClick={() => navigate('/superadmin/ca-firms/create')}
        >
          Create CA Firm
        </Button>
      </Box>

      {/* Filter and search bar */}
      <Paper elevation={0} className="filter-paper" sx={{ p: 2, mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search by firm name or firm code..."
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#52796f' }} />
              </InputAdornment>
            )
          }}
          className="search-field"
        />
      </Paper>

      {/* Firms Table */}
      {loading ? (
        <Box className="spinner-container">
          <CircularProgress color="success" />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} className="table-paper">
          <Table className="firms-table">
            <TableHead>
              <TableRow>
                <TableCell>Firm Details</TableCell>
                <TableCell>Firm Code</TableCell>
                <TableCell>Primary Admin</TableCell>
                <TableCell>Contact Phone</TableCell>
                <TableCell>City</TableCell>
                <TableCell align="center">Active Licenses</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFirms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" className="empty-row">
                    <Business className="empty-icon" />
                    <Typography variant="body2">No registered CA Firms found matching search criteria.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFirms.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell className="cell-firm-name">
                      <div className="firm-cell-info">
                        <strong>{f.firm_name}</strong>
                        <span>{f.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="cell-firm-code">{f.firm_code}</TableCell>
                    <TableCell className="cell-admin">
                      <div className="admin-cell-info">
                        <strong>{f.admin_name}</strong>
                        <span>{f.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="cell-phone">{f.mobile}</TableCell>
                    <TableCell className="cell-city">{f.city || 'Not set'}</TableCell>
                    <TableCell align="center" className="cell-licenses">
                      <Chip
                        label={`${f.active_subscriptions} Modules`}
                        className={`module-count-badge ${f.active_subscriptions > 0 ? 'has-modules' : ''}`}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={f.status}
                        className={`status-chip ${getStatusChipClass(f.status)}`}
                        icon={getStatusIcon(f.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        className="view-details-btn"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/superadmin/ca-firms/${f.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

export default CAFirmsList
