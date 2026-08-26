const fs = require('fs');
let content = fs.readFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'utf8');

const camEffectTarget = '  // Manage video tracks\\r\\n  useEffect(() => {\\r\\n    if (screen === 5 || screen === 8 || screen === 10) {\\r\\n      startCamera();\\r\\n    } else {\\r\\n      stopCamera();\\r\\n    }\\r\\n    return () => stopCamera();\\r\\n  }, [screen]);';

const newCamEffect = \  // Manage video tracks
  useEffect(() => {
    if ((screen === 5 && !cameraConfirmed) || screen === 8 || screen === 10) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [screen, cameraConfirmed]);\;

content = content.replace(camEffectTarget, newCamEffect);
fs.writeFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', content, 'utf8');
