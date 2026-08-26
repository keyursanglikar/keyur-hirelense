const fs = require('fs');
let content = fs.readFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'utf8');

content = content.replace(/\\'/g, "'");

fs.writeFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', content, 'utf8');
