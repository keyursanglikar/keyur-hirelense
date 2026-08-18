import React, { useState, useEffect } from 'react';
import './index.css';
const EmployerPortal = React.lazy(() => import('./apps/employer-portal/src/EmployerPortal.jsx'));
const CandidateFlow = React.lazy(() => import('./apps/candidate-flow/src/CandidateFlow.jsx'));

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    // Custom event to handle programmatical switches
    window.addEventListener('pathnamechange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pathnamechange', handleLocationChange);
    };
  }, []);

  return (
    <React.Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Loading App...</div>}>
      {currentPath === '/candidate' || currentPath === '/interview' || currentPath.startsWith('/interview/invite/') || currentPath.startsWith('/candidate-portal')
        ? <CandidateFlow />
        : <EmployerPortal />}
    </React.Suspense>
  );
}

export default App;
