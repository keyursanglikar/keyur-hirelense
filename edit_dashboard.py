import re

file_path = 'f:/FREELANCE/NZ-Solutions/Hirelens_SuperAdmin/ca_saas_platform/ca-saas-platform/frontend/src/superadmin/SuperAdminDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add React hooks and axios
content = content.replace("import { Routes, Route, Navigate } from 'react-router-dom'", "import React, { useState, useEffect } from 'react'\nimport { Routes, Route, Navigate } from 'react-router-dom'\nimport axios from 'axios'")

# We need to replace the SuperAdminMetrics component.
# Find where SuperAdminMetrics starts
start_index = content.find("const SuperAdminMetrics = () => {")

# Before start_index, we have the mock data. Let's remove the mock data.
mock_data_start = content.find("// Mock Analytics Data")
if mock_data_start != -1:
    content = content[:mock_data_start] + content[start_index:]

# Now we need to inject the useState and useEffect inside SuperAdminMetrics
start_index = content.find("const SuperAdminMetrics = () => {")
# Find the next line
insert_index = content.find("const { user } = useSelector((state) => state.auth)", start_index)

injection = '''
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
      const res = await axios.get('http://localhost:8000/api/firms/dashboard/', {
        headers: { Authorization: Bearer  }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const { metrics, chartData: revenuePerformanceData, recentSubscriptions, planDetails } = dashboardData;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><LinearProgress sx={{ width: '50%', color: '#006c3f' }} /></Box>;
  }

  '''

content = content[:insert_index] + injection + content[insert_index:]

# Now replace the hardcoded values with variables
content = content.replace('<Typography className="metric-value">42</Typography>', '<Typography className="metric-value">{metrics.total_firms}</Typography>')
content = content.replace('<Typography className="metric-subtext">36 Active Subscriptions</Typography>', '<Typography className="metric-subtext">{metrics.active_subscriptions} Active Subscriptions</Typography>')

content = content.replace('<Typography className="metric-value">4 Active</Typography>', '<Typography className="metric-value">{metrics.total_plans} Active</Typography>')
content = content.replace('<Typography className="metric-subtext">4 Active / 0 Inactive</Typography>', '<Typography className="metric-subtext">{metrics.total_plans} Active Plans Total</Typography>')
content = content.replace('<span className="plans-summary-tag tag-active"><CheckCircle /> 4 Active</span>', '<span className="plans-summary-tag tag-active"><CheckCircle /> {metrics.total_plans} Active</span>')

content = content.replace('<Typography className="metric-value">36</Typography>', '<Typography className="metric-value">{metrics.active_subscriptions}</Typography>')
content = content.replace('<Typography className="metric-subtext">1 Expired in last 30d</Typography>', '<Typography className="metric-subtext">Active Licenses in system</Typography>')
content = content.replace('label="94.2%"', 'label="100%"')

content = content.replace('<Typography className="metric-value">₹12.45L</Typography>', '<Typography className="metric-value">₹{metrics.total_revenue}</Typography>')
content = content.replace('<Typography className="metric-subtext">₹1.25L received this month</Typography>', '<Typography className="metric-subtext">Total Revenue Generated</Typography>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard replaced.")
