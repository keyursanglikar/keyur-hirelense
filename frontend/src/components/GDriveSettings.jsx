import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import api from '../api';

const GDriveSettings = ({ onSaveSuccess }) => {
  const [gdriveJson, setGdriveJson] = useState('');
  const [gdriveFolderId, setGdriveFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/firms/gdrive-settings/');
      if (res.data) {
        setGdriveJson(res.data.service_account_json || '');
        setGdriveFolderId(res.data.folder_id || '');
      }
    } catch (err) {
      console.error('Failed to fetch GDrive settings:', err);
    }
  };

  const handleSave = async () => {
    if (!gdriveJson.trim() || !gdriveFolderId.trim()) {
      setError('Both Service Account JSON and Folder ID are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/firms/gdrive-settings/', {
        service_account_json: gdriveJson,
        folder_id: gdriveFolderId
      });
      setSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Failed to save GDrive settings:', err);
      setError('Failed to save Google Drive settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b4332', mb: 1 }}>
        Google Drive Configuration
      </Typography>
      <Typography variant="body1" sx={{ color: '#40916c', mb: 3 }}>
        Configure where candidate interview videos will be automatically saved. Videos will be uploaded as JobName_Date/CandidateName_ID/interview.mp4.
      </Typography>

      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2efe6' }}>
        <Box sx={{ backgroundColor: '#f0f4f8', p: 2, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Setup Instructions:</Typography>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
            <li>Go to Google Cloud Console and create a Service Account.</li>
            <li>Generate a JSON key and paste its entire contents into the "Service Account JSON" field below.</li>
            <li>Create a folder in Google Drive, and share it with the Service Account email as Editor.</li>
            <li>Copy the Folder ID from the Drive URL and paste it below.</li>
          </ol>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>Google Drive settings saved successfully!</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Service Account JSON"
            multiline
            rows={4}
            value={gdriveJson}
            onChange={(e) => setGdriveJson(e.target.value)}
            placeholder='{"type": "service_account", ...}'
            fullWidth
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />

          <TextField
            label="Google Drive Folder ID"
            value={gdriveFolderId}
            onChange={(e) => setGdriveFolderId(e.target.value)}
            placeholder="e.g. 1aBcDeFgHiJkLmNoP_QrStUvWxYz"
            fullWidth
          />

          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={loading}
            sx={{ 
              backgroundColor: '#2d6a4f', 
              '&:hover': { backgroundColor: '#1b4332' },
              alignSelf: 'flex-start',
              px: 4,
              py: 1,
              borderRadius: '8px'
            }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default GDriveSettings;
