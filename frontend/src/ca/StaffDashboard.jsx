import React from 'react'
import { Box, Typography, Container, Grid, Card, CardContent } from '@mui/material'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'

const StaffDashboard = () => {
  const { user } = useSelector((state) => state.auth)

  return (
    <>
      <Helmet>
        <title>Staff Dashboard</title>
      </Helmet>
      
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Staff Dashboard - Access your assigned modules
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Assigned Modules
                  </Typography>
                  <Typography variant="h4">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Tasks
                  </Typography>
                  <Typography variant="h4">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Completed Tasks
                  </Typography>
                  <Typography variant="h4">0</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  )
}

export default StaffDashboard