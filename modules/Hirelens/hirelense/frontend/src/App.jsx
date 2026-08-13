import React, { useState, useEffect } from 'react';
import './index.css';
import EmployerPortal from './apps/employer-portal/src/EmployerPortal.jsx';
import CandidateFlow from './apps/candidate-flow/src/CandidateFlow.jsx';

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

  if (currentPath === '/candidate' || currentPath === '/interview' || currentPath.startsWith('/interview/invite/') || currentPath.startsWith('/candidate-portal')) {
    return <CandidateFlow />;
  }
  return <EmployerPortal />;
}

export default App;
