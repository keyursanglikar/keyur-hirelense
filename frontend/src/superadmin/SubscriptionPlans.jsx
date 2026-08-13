import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert, Chip, Divider, Button
} from '@mui/material';
import { Payments, Edit, Add } from '@mui/icons-material';
import axios from 'axios';

const SubscriptionPlans = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await axios.get('http://localhost:8000/api/firms/modules/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModules(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: '#006c3f' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center' }}>
          <Payments sx={{ mr: 1, color: '#006c3f', fontSize: 28 }} /> Subscription Plans
        </Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2, textTransform: 'none', px: 2, py: 0.8, backgroundColor: '#006c3f', '&:hover': { backgroundColor: '#005330' }, fontWeight: 600 }}>
          Create Plan
        </Button>
      </Box>

      {modules.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, backgroundColor: '#f9fafb' }} elevation={0}>
          <Typography variant="h6" color="textSecondary">No modules or plans found.</Typography>
        </Paper>
      ) : (
        modules.map(module => (
          <Paper key={module.id} sx={{ mb: 3, p: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f3f4f6' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>{module.module_name}</Typography>
              <Chip label={module.slug} size="small" sx={{ ml: 2, backgroundColor: '#e2efe6', color: '#006c3f', fontWeight: 600, fontSize: '0.7rem', height: 24 }} />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{module.description}</Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              {module.plans.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>No plans created for this module yet.</Alert>
                </Grid>
              ) : (
                module.plans.map(plan => (
                  <Grid item xs={12} sm={6} md={4} key={plan.id}>
                    <Card variant="outlined" sx={{ 
                      height: '100%', 
                      borderRadius: 2, 
                      borderColor: '#e5e7eb',
                      transition: 'all 0.2s', 
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': { 
                        transform: 'translateY(-2px)', 
                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)',
                        borderColor: '#006c3f'
                      } 
                    }}>
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="overline" sx={{ fontWeight: 600, color: '#6b7280', letterSpacing: 1, fontSize: '0.65rem' }}>{plan.duration_days} Days</Typography>
                          {plan.is_trial && <Chip label="Trial" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />}
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 0.5, lineHeight: 1.2 }}>
                          {plan.plan_name}
                        </Typography>
                        <Box sx={{ mt: 'auto', pt: 2 }}>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#006c3f', mb: 2 }}>
                            ₹{plan.price}
                          </Typography>
                          <Button variant="outlined" size="small" fullWidth startIcon={<Edit fontSize="small" />} sx={{ borderRadius: 1.5, color: '#4b5563', borderColor: '#d1d5db', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#f9fafb', borderColor: '#9ca3af' } }}>
                            Edit Plan
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>
        ))
      )}
    </Box>
  );
};

export default SubscriptionPlans;
