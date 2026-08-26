const fs = require('fs');
let content = fs.readFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'utf8');

const target = '<button className="btn primary" onClick={handleSaveAndContinue} disabled={!(hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && capturedPhoto)} style={{ background: (hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && capturedPhoto) ? \\'var(--ok)\\' : \\'rgba(255,255,255,0.1)\\', color: (hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && capturedPhoto) ? \\'#fff\\' : \\'rgba(255,255,255,0.3)\\' }}>';

const replacement = '<button className="btn primary" onClick={handleSaveAndContinue} disabled={!(hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && cameraConfirmed)} style={{ background: (hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && cameraConfirmed) ? \\'var(--ok)\\' : \\'rgba(255,255,255,0.1)\\', color: (hasCameraPermission && hasMicPermission && micTestState === \\'verified\\' && speakerState === \\'verified\\' && cameraConfirmed) ? \\'#fff\\' : \\'rgba(255,255,255,0.3)\\' }}>';

content = content.replace(target, replacement);
fs.writeFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', content, 'utf8');
