// frontend/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import App from './App'
import { store } from './redux/store'
import './index.css'


// --- VITE CHUNK ERROR HANDLING ---
// When Vercel deploys a new version, old chunk hashes are deleted.
// If a user with a stale session tries to navigate, Vite throws a chunk load error.
// We intercept this and force a hard reload to get the new chunks.
window.addEventListener("vite:preloadError", (event) => {
  window.location.reload();
});

window.addEventListener("unhandledrejection", (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("Failed to fetch dynamically imported module")) {
    event.preventDefault();
    window.location.reload();
  }
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#2d6a4f',      // Deep emerald green
      light: '#52b788',     // Mint green
      dark: '#1b4332',      // Deep forest green
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#40916c',      // Accent forest green
    },
    background: {
      default: '#f8faf8',   // Premium off-white with tiny green undertone
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </Provider>
  </React.StrictMode>
)