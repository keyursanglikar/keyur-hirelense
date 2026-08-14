// frontend/src/components/SuperAdminDashboard.jsx

import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import CAFirmsList from './CAFirmsList'
import CAFirmsCreate from './CAFirmsCreate'
import CAFirmsDetail from './CAFirmsDetail'
import EmailSettings from '../components/EmailSettings'
import ModuleDirectory from './ModuleDirectory'
import SubscriptionPlans from './SubscriptionPlans'

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress
} from '@mui/material'
import {
  Business,
  Payments,
  CardMembership,
  Category,
  CheckCircle,
  ArrowUpward
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import './SuperAdminDashboard.css'

const SuperAdminMetrics = () => {
  
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    metrics: { total_firms: 0, total_plans: 0, active_subscriptions: 0, total_revenue: 0 },
    chartData: [],
    recentSubscriptions: [],
    planDetails: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/firms/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const { metrics, chartData: revenuePerformanceData, recentSubscriptions, planDetails } = dashboardData;

  const { user } = useSelector((state) => state.auth)

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><LinearProgress sx={{ width: '50%', color: '#006c3f' }} /></Box>;
  }

  return (
    <>
      <Helmet>
        <title>Super Admin Dashboard</title>
      </Helmet>

      <Box className="dashboard-content">
        {/* Dashboard Welcome Header */}
        <Box className="dashboard-welcome" sx={{ mb: 3 }}>
          <div>
            <Typography variant="h5" className="welcome-title">
              Welcome Back, {user?.first_name || 'Super'} {user?.last_name || 'Admin'}
            </Typography>
            <Typography variant="body2" className="welcome-subtitle">
              SaaS Gateway Controls • Real-time CA firm activity and licensing insights.
            </Typography>
          </div>
          <Chip label="2026 Edition" className="edition-badge" />
        </Box>

        {/* Metrics Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Card 1: Firms */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="metric-card card-firms">
              <CardContent className="metric-card-content">
                <div className="card-header-box">
                  <div className="icon-wrapper bg-green-light">
                    <Business className="icon-main text-green" />
                  </div>
                  <Chip 
                    label="+12.4%" 
                    icon={<ArrowUpward className="chip-arrow" />} 
                    className="trend-badge badge-up" 
                    size="small" 
                  />
                </div>
                <Typography className="metric-label">Total CA Firms</Typography>
                <Typography className="metric-value">{metrics.total_firms}</Typography>
                <Typography className="metric-subtext">{metrics.active_subscriptions} Active Subscriptions</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Active Plans */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="metric-card card-plans">
              <CardContent className="metric-card-content">
                <div className="card-header-box">
                  <div className="icon-wrapper bg-mint-light">
                    <Category className="icon-main text-mint" />
                  </div>
                  <div className="plans-summary-box">
                    <span className="plans-summary-tag tag-active"><CheckCircle /> {metrics.total_plans} Active</span>
                  </div>
                </div>
                <Typography className="metric-label">Subscription Plans</Typography>
                <Typography className="metric-value">{metrics.total_plans} Active</Typography>
                <Typography className="metric-subtext">{metrics.total_plans} Active Plans Total</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Active Subscriptions */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="metric-card card-subs">
              <CardContent className="metric-card-content">
                <div className="card-header-box">
                  <div className="icon-wrapper bg-gold-light">
                    <CardMembership className="icon-main text-gold" />
                  </div>
                  <Chip 
                    label="100%" 
                    className="trend-badge badge-ratio" 
                    size="small" 
                  />
                </div>
                <Typography className="metric-label">Active Licenses</Typography>
                <Typography className="metric-value">{metrics.active_subscriptions}</Typography>
                <Typography className="metric-subtext">Active Licenses in system</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Total Revenue */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="metric-card card-revenue">
              <CardContent className="metric-card-content">
                <div className="card-header-box">
                  <div className="icon-wrapper bg-emerald-light">
                    <Payments className="icon-main text-emerald" />
                  </div>
                  <Chip 
                    label="+18.5%" 
                    icon={<ArrowUpward className="chip-arrow" />} 
                    className="trend-badge badge-up" 
                    size="small" 
                  />
                </div>
                <Typography className="metric-label">Total Revenue</Typography>
                <Typography className="metric-value">₹{metrics.total_revenue}</Typography>
                <Typography className="metric-subtext">Total Revenue Generated</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts & Analytics Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Main Chart */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} className="dashboard-paper chart-container-paper">
              <div className="paper-header">
                <Typography className="paper-title">Revenue & Firm Registrations Trends</Typography>
                <Typography className="paper-subtitle">Aggregated growth overview for early 2026</Typography>
              </div>
              <Box sx={{ height: 320, width: '100%', mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenuePerformanceData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f2" />
                    <XAxis dataKey="month" stroke="#748c82" fontSize={11} />
                    <YAxis stroke="#748c82" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#ffffff', borderRadius: 8, borderColor: '#e8f0eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area 
                      type="monotone" 
                      dataKey="Revenue" 
                      stroke="#2d6a4f" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      name="Revenue (INR)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Side Chart: Plans Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={0} className="dashboard-paper plans-distribution-paper">
              <div className="paper-header">
                <Typography className="paper-title">Active Licenses by Plan</Typography>
                <Typography className="paper-subtitle">Distribution across active CA firms</Typography>
              </div>
              <Box className="plans-list-container" sx={{ mt: 3 }}>
                {planDetails.map((plan) => {
                  const total = plan.active + plan.inactive
                  const percent = total > 0 ? (plan.active / total) * 100 : 0
                  return (
                    <Box key={plan.name} className="plan-item-box" sx={{ mb: 2.5 }}>
                      <div className="plan-item-header">
                        <span className="plan-item-name">{plan.name}</span>
                        <span className="plan-item-count">{plan.active} Active</span>
                      </div>
                      <LinearProgress 
                        variant="determinate" 
                        value={percent} 
                        className="plan-progress-bar"
                        style={{ '--bar-color': plan.color }}
                      />
                      <div className="plan-item-footer">
                        <span>Price: {plan.price}</span>
                        <span>{plan.inactive} Inactive</span>
                      </div>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Latest Subscriptions Table */}
        <Paper elevation={0} className="dashboard-paper table-paper">
          <div className="paper-header" style={{ marginBottom: '15px' }}>
            <Typography className="paper-title">Latest CA Subscription Events</Typography>
            <Typography className="paper-subtitle">Recent license renewals and registrations</Typography>
          </div>
          <TableContainer>
            <Table className="subscriptions-table">
              <TableHead>
                <TableRow>
                  <TableCell>Subscription ID</TableCell>
                  <TableCell>CA Firm</TableCell>
                  <TableCell>CA Partner</TableCell>
                  <TableCell>Plan Selected</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Purchase Date</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell align="center">License Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSubscriptions.map((sub) => (
                  <TableRow key={sub.id} hover>
                    <TableCell className="cell-id">{sub.id}</TableCell>
                    <TableCell className="cell-firm">{sub.firm}</TableCell>
                    <TableCell className="cell-owner">{sub.owner}</TableCell>
                    <TableCell className="cell-plan">{sub.plan}</TableCell>
                    <TableCell className="cell-amount">{sub.amount}</TableCell>
                    <TableCell className="cell-date">{sub.date}</TableCell>
                    <TableCell className="cell-date">{sub.expiry}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={sub.status}
                        className={`status-chip chip-${sub.status.toLowerCase()}`}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </>
  )
}

const SuperAdminDashboard = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<SuperAdminMetrics />} />
      <Route path="firms" element={<CAFirmsList />} />
      <Route path="ca-firms/create" element={<CAFirmsCreate />} />
      <Route path="ca-firms/:id" element={<CAFirmsDetail />} />
      <Route path="modules" element={<ModuleDirectory />} />
      <Route path="subscriptions" element={<SubscriptionPlans />} />
      <Route path="settings" element={<EmailSettings type="system" />} />
      <Route path="" element={<Navigate to="dashboard" />} />
    </Routes>
  )
}

export default SuperAdminDashboard