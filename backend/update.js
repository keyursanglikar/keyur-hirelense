const fs = require('fs');
let content = fs.readFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'utf8');

const startStr = '<div className="staged-grid">';
const endStr = '              <div style={{ display: \'flex\', justifyContent: \'space-between\', marginTop: \'32px\' }}>';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = fs.readFileSync('grid_replacement.txt', 'utf8');
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', content, 'utf8');
} else {
    console.log('Not found');
}
