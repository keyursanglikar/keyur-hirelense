import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert, Chip, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox
} from '@mui/material';
import { Payments, Edit, Add } from '@mui/icons-material';
import api from '../api';

const SubscriptionPlans = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [formData, setFormData] = useState({
    module_id: '',
    plan_name: '',
    plan_code: '',
    price: '',
    duration_days: 365,
    is_trial: false
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await api.get(`/firms/modules/`);
      setModules(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setModalMode('add');
    setCurrentPlanId(null);
    setFormData({
      module_id: modules.length > 0 ? modules[0].id : '',
      plan_name: '',
      plan_code: '',
      price: '',
      duration_days: 365,
      is_trial: false
    });
    setModalOpen(true);
  };

  const handleEditClick = (plan, module_id) => {
    setModalMode('edit');
    setCurrentPlanId(plan.id);
    setFormData({
      module_id: module_id,
      plan_name: plan.plan_name,
      plan_code: plan.plan_code,
      price: plan.price,
      duration_days: plan.duration_days,
      is_trial: plan.is_trial
    });
    setModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (modalMode === 'add') {
        await api.post('/firms/plans/', formData);
      } else {
        await api.patch(`/firms/plans/${currentPlanId}/`, formData);
      }
      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      alert("Error saving plan: " + (err.response?.data?.error || err.message));
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
        <Button onClick={handleCreateClick} variant="contained" startIcon={<Add />} sx={{ borderRadius: 2, textTransform: 'none', px: 2, py: 0.8, backgroundColor: '#006c3f', '&:hover': { backgroundColor: '#005330' }, fontWeight: 600 }}>
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
                          <Button onClick={() => handleEditClick(plan, module.id)} variant="outlined" size="small" fullWidth startIcon={<Edit fontSize="small" />} sx={{ borderRadius: 1.5, color: '#4b5563', borderColor: '#d1d5db', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#f9fafb', borderColor: '#9ca3af' } }}>
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

      {/* Create/Edit Plan Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#111827' }}>
          {modalMode === 'add' ? 'Create Subscription Plan' : 'Edit Subscription Plan'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {modalMode === 'add' && (
            <FormControl fullWidth size="medium" sx={{ mt: 1 }}>
              <InputLabel>Module</InputLabel>
              <Select
                value={formData.module_id}
                onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                label="Module"
              >
                {modules.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.module_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Plan Name"
            fullWidth
            size="medium"
            value={formData.plan_name || ''}
            onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
            sx={{ mt: modalMode === 'edit' ? 1 : 0 }}
          />
          <TextField
            label="Plan Code (e.g., BASIC_1M)"
            fullWidth
            size="medium"
            value={formData.plan_code || ''}
            onChange={(e) => setFormData({ ...formData, plan_code: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              label="Price (₹)"
              type="number"
              fullWidth
              size="medium"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <TextField
              label="Duration (Days)"
              type="number"
              fullWidth
              size="medium"
              value={formData.duration_days || ''}
              onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
            />
          </Box>
          <FormControlLabel
            control={<Checkbox color="success" checked={!!formData.is_trial} onChange={(e) => setFormData({ ...formData, is_trial: e.target.checked })} />}
            label="Is Trial Plan"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#6b7280', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePlan} sx={{ backgroundColor: '#006c3f', '&:hover': { backgroundColor: '#005330' }, fontWeight: 600 }}>
            {modalMode === 'add' ? 'Create Plan' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlans;
