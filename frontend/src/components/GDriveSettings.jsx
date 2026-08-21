import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
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
        Google Drive Integration
      </Typography>
      
      {/* WHY SECTION */}
      <Box sx={{ backgroundColor: '#eef5f0', border: '1px solid #d8eadd', borderRadius: 2, p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1b4332', mb: 0.5 }}>
          ? Why do we need Google Drive?
        </Typography>
        <Typography variant="body2" sx={{ color: '#2d6a4f', lineHeight: 1.6 }}>
          Video files from candidate interviews are massive and expensive to store on standard servers. By integrating directly with <strong>your firm's Google Drive</strong>, you maintain 100% ownership of your candidates' video data. The platform will automatically upload the recordings to your own secure Drive folders (organized by Job and Candidate), ensuring you never pay expensive markup for video storage. 
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2efe6' }}>
        
        {/* SETUP INSTRUCTIONS */}
        <Box sx={{ backgroundColor: '#f0f4f8', p: 3, borderRadius: 2, mb: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>??? Step-by-Step Setup Instructions:</Typography>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
            <li>
              Go to the <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</Link> and log in with your Firm's Google account.
            </li>
            <li>
              Create a new Project (or select an existing one), then navigate to <strong>IAM &amp; Admin {'>'} Service Accounts</strong>.
            </li>
            <li>
              Click <strong>Create Service Account</strong>, name it "Hirelens Uploader", and click Done.
            </li>
            <li>
              Click on the newly created Service Account, go to the <strong>Keys</strong> tab, click <strong>Add Key {'>'} Create New Key</strong>, and choose <strong>JSON</strong>.
            </li>
            <li>
              A JSON file will download to your computer. Open it in Notepad, copy the <strong>entire contents</strong>, and paste it into the <strong>Service Account JSON</strong> field below.
            </li>
            <li>
              Now open your actual <strong>Google Drive</strong> and create a new master folder (e.g. "Hirelens Interview Recordings").
            </li>
            <li>
              Right-click the folder, click <strong>Share</strong>, and paste the <strong>email address of your Service Account</strong> (found inside the JSON file you just downloaded) and grant it <strong>Editor</strong> permissions.
            </li>
            <li>
              Open the folder in your browser. Look at the URL at the top: <br/>
              <code style={{ background: '#e0e0e0', padding: '2px 4px', borderRadius: '4px' }}>drive.google.com/drive/folders/<b>1aBcDeFgHiJkLmNoP_QrStUvWxYz</b></code><br/>
              Copy that long ID at the end and paste it into the <strong>Google Drive Folder ID</strong> field below.
            </li>
          </ol>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>Google Drive settings saved successfully!</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Service Account JSON"
            multiline
            rows={6}
            value={gdriveJson}
            onChange={(e) => setGdriveJson(e.target.value)}
            placeholder='{"type": "service_account", "project_id": "...", ...}'
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
              py: 1.5,
              borderRadius: '8px',
              fontWeight: 600
            }}
          >
            {loading ? 'Saving...' : 'Save Google Drive Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default GDriveSettings;
