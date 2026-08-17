// frontend/src/components/DashboardLayout.jsx

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, IconButton, Avatar, Button } from '@mui/material'
import {
  Dashboard,
  Business,
  Layers,
  CreditCard,
  Settings,
  People,
  Folder,
  Assignment,
  Person,
  Menu,
  Logout as LogoutIcon,
  Notifications,
  MenuOpen,
  CalendarToday,
  AccessTime,
  WbSunny
} from '@mui/icons-material'
import { logoutUser } from '../redux/slices/authSlice'
import './DashboardLayout.css'

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const { user } = useSelector((state) => state.auth)
  const role = user?.role || sessionStorage.getItem('role') || 'staff'

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(clockTimer)
  }, [])

  const formatDate = () => {
    return time.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = () => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login')
    })
  }

  // Define navigation menus per user role
  const getNavItems = () => {
    switch (role) {
      case 'super_admin':
        return [
          { text: 'Dashboard', icon: <Dashboard className="menu-item-icon" />, path: '/superadmin/dashboard' },
          { text: 'CA Firms', icon: <Business className="menu-item-icon" />, path: '/superadmin/firms' },
          { text: 'Module Directory', icon: <Layers className="menu-item-icon" />, path: '/superadmin/modules' },
          { text: 'Subscriptions', icon: <CreditCard className="menu-item-icon" />, path: '/superadmin/subscriptions' },
          { text: 'Global Settings', icon: <Settings className="menu-item-icon" />, path: '/superadmin/settings' },
        ]
      case 'firm_admin':
        return [
          { text: 'Dashboard', icon: <Dashboard className="menu-item-icon" />, path: '/firm/dashboard' },
          { text: 'Staff Directory', icon: <People className="menu-item-icon" />, path: '/firm/staff' },
          { text: 'Hirelens Module', icon: <Layers className="menu-item-icon" />, path: '/firm/modules' },
          { text: 'Firm Settings', icon: <Settings className="menu-item-icon" />, path: '/firm/settings' },
        ]
      case 'staff':
      default:
        return [
          { text: 'Dashboard', icon: <Dashboard className="menu-item-icon" />, path: '/staff/dashboard' },
          { text: 'My Modules', icon: <Layers className="menu-item-icon" />, path: '/staff/modules' },
          { text: 'Assigned Tasks', icon: <Assignment className="menu-item-icon" />, path: '/staff/tasks' },
          { text: 'Documents', icon: <Folder className="menu-item-icon" />, path: '/staff/documents' },
          { text: 'My Profile', icon: <Person className="menu-item-icon" />, path: '/staff/profile' },
        ]
    }
  }

  const getPortalName = () => {
    switch (role) {
      case 'super_admin':
        return 'NZSolution • Super Admin Portal'
      case 'firm_admin':
        return 'NZSolution • CA Portal'
      case 'staff':
      default:
        return 'NZSolution • Staff Hub'
    }
  }

  const getRoleDisplayName = () => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'firm_admin':
        return 'CA Partner'
      case 'staff':
      default:
        return 'Firm Staff'
    }
  }

  const navItems = getNavItems()

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return 'NZ'
    return `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() || 'NZ'
  }

  const activeRoute = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleNavItemClick = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <Box
          className="mobile-backdrop"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(27, 67, 50, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 190,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <svg className="sidebar-logo" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sidebar-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2d6a4f" />
                <stop offset="100%" stopColor="#52b788" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#sidebar-logo-grad)" strokeWidth="2.5" />
            <circle cx="60" cy="60" r="44" fill="#ffffff" />
            <g transform="translate(10, 10)">
              <path d="M 75 35 A 25 25 0 1 0 75 65" fill="none" stroke="#2d6a4f" strokeWidth="8" strokeLinecap="round" />
              <path d="M 40 70 L 60 30 L 80 70" fill="none" stroke="#52b788" strokeWidth="6" strokeLinecap="round" />
              <path d="M 48 56 L 72 56" fill="none" stroke="#52b788" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
          <span className="sidebar-brand-name">NZSolution CA</span>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section-title">Navigation Portal</div>
          {navItems.map((item) => (
            <div
              key={item.text}
              onClick={() => handleNavItemClick(item.path)}
              className={`menu-item ${activeRoute(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              <span className="menu-item-text">{item.text}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content pane */}
      <div className={`main-wrapper ${collapsed ? 'expanded' : ''}`}>
        <header className="top-bar">
          <div className="topbar-left">
            {/* Desktop toggle button */}
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              className="toggle-sidebar-btn d-none-mobile"
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {collapsed ? <Menu /> : <MenuOpen />}
            </IconButton>

            {/* Mobile toggle button */}
            <IconButton
              onClick={() => setMobileOpen(!mobileOpen)}
              className="toggle-sidebar-btn d-none-desktop"
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <Menu />
            </IconButton>

            <span className="topbar-portal-name">{getPortalName()}</span>
          </div>

          {/* Centralized Widgets: Date, Time & Weather */}
          <div className="topbar-widgets">
            <div className="widget-item widget-date">
              <CalendarToday className="widget-icon" />
              <span>{formatDate()}</span>
            </div>
            <div className="widget-item widget-time">
              <AccessTime className="widget-icon" />
              <span>{formatTime()}</span>
            </div>
            <div className="widget-item widget-weather">
              <WbSunny className="widget-icon weather-sunny" />
              <span>Partly Cloudy, 28°C</span>
            </div>
          </div>

          <div className="topbar-right">
            <IconButton color="default" sx={{ color: '#52796f' }}>
              <Notifications fontSize="medium" />
            </IconButton>

            <div className="user-profile-widget">
              <Avatar className="user-profile-avatar">{getInitials()}</Avatar>
              <div className="user-profile-info" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="user-profile-name">
                  {user ? `${user.first_name} ${user.last_name}` : 'NZ Administrator'}
                </span>
                <span className="user-profile-role">{getRoleDisplayName()}</span>
              </div>
            </div>

            <Button
              variant="outlined"
              color="error"
              size="small"
              className="logout-btn"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
