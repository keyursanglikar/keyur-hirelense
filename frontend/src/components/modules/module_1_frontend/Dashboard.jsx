import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'

const Module1Dashboard = () => {
  return (
    <Box sx={{ p: 4, background: '#f8faf9', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1b4332', mb: 3 }}>
        📦 Module 1 Frontend
      </Typography>
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2efe6', boxShadow: 'none' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ color: '#2d6a4f', mb: 2 }}>
            Welcome to the dynamically loaded monolithic frontend!
          </Typography>
          <Typography variant="body1" color="textSecondary">
            This module resides independently in <code>src/components/modules/module_1_frontend</code> but is 
            seamlessly discovered by Vite and routed on Port 5173 without any server restart required!
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Module1Dashboard
