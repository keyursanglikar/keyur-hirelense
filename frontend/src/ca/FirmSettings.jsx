import React from 'react'
import { Box, Typography, Divider } from '@mui/material'
import EmailSettings from '../components/EmailSettings'
import GDriveSettings from '../components/GDriveSettings'

const FirmSettings = () => {
  return (
    <Box sx={{ maxWidth: '900px', margin: '0 auto', pb: 8 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1b4332', mb: 3 }}>
        Firm Integration Settings
      </Typography>

      <Box sx={{ mb: 6 }}>
        <EmailSettings type="firm" />
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box>
        <GDriveSettings />
      </Box>
    </Box>
  )
}

export default FirmSettings
