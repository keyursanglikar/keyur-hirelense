import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\employer-portal\src\EmployerPortal.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace state initialization
content = re.sub(r"const \[wizTitle, setWizTitle\] = useState\('.*?'\);", "const [wizTitle, setWizTitle] = useState('');", content)
content = re.sub(r"const \[wizDesc, setWizDesc\] = useState\('.*?'\);", "const [wizDesc, setWizDesc] = useState('');", content)
content = re.sub(r"const \[wizDept, setWizDept\] = useState\('.*?'\);", "const [wizDept, setWizDept] = useState('');", content)
content = re.sub(r"const \[wizLocation, setWizLocation\] = useState\('.*?'\);", "const [wizLocation, setWizLocation] = useState('');", content)
content = re.sub(r"const \[wizSalary, setWizSalary\] = useState\('.*?'\);", "const [wizSalary, setWizSalary] = useState('');", content)
content = re.sub(r"const \[wizHiringManager, setWizHiringManager\] = useState\('.*?'\);", "const [wizHiringManager, setWizHiringManager] = useState('');", content)
content = re.sub(r"const \[wizType, setWizType\] = useState\('.*?'\);", "const [wizType, setWizType] = useState('');", content)
content = re.sub(r"const \[wizExp, setWizExp\] = useState\('.*?'\);", "const [wizExp, setWizExp] = useState('');", content)
content = re.sub(r"const \[wizDefaultDuration, setWizDefaultDuration\] = useState\('.*?'\);", "const [wizDefaultDuration, setWizDefaultDuration] = useState('');", content)

# Replace 'New opening' button onClick
content = re.sub(r"setWizTitle\('.*?'\);", "setWizTitle('');", content)
content = re.sub(r"setWizDesc\('.*?'\);", "setWizDesc('');", content)
content = re.sub(r"setWizDept\('.*?'\);", "setWizDept('');", content)
content = re.sub(r"setWizLocation\('.*?'\);", "setWizLocation('');", content)
content = re.sub(r"setWizSalary\('.*?'\);", "setWizSalary('');", content)
content = re.sub(r"setWizHiringManager\('.*?'\);", "setWizHiringManager('');", content)
content = re.sub(r"setWizType\('.*?'\);", "setWizType('');", content)
content = re.sub(r"setWizExp\('.*?'\);", "setWizExp('');", content)
content = re.sub(r"setWizDefaultDuration\('.*?'\);", "setWizDefaultDuration('');", content)

# BUT wait, handleEditAndAttachFlow has:
# setWizTitle(op.title || '');
# This regex will match it because it has no quotes? No, the regex uses '.*?' so it only matches string literals.

# For inputs:
content = re.sub(
    r'<input value=\{wizTitle\} onChange=\{\(e\) => setWizTitle\(e\.target\.value\)\} placeholder=".*?" \/>',
    r'<input value={wizTitle} onChange={(e) => setWizTitle(e.target.value)} placeholder="Senior Backend Developer" />',
    content
)
content = re.sub(
    r'<input value=\{wizDept\} onChange=\{\(e\) => setWizDept\(e\.target\.value\)\} placeholder=".*?" \/>',
    r'<input value={wizDept} onChange={(e) => setWizDept(e.target.value)} placeholder="Engineering" />',
    content
)
content = re.sub(
    r'<input value=\{wizLocation\} onChange=\{\(e\) => setWizLocation\(e\.target\.value\)\} placeholder=".*?" \/>',
    r'<input value={wizLocation} onChange={(e) => setWizLocation(e.target.value)} placeholder="Pune, hybrid" />',
    content
)
content = re.sub(
    r'<input value=\{wizSalary\} onChange=\{\(e\) => setWizSalary\(e\.target\.value\)\} placeholder=".*?" \/>',
    r'<input value={wizSalary} onChange={(e) => setWizSalary(e.target.value)} placeholder="₹8.0 - ₹12.0 LPA" />',
    content
)
content = re.sub(
    r'<input value=\{wizHiringManager\} onChange=\{\(e\) => setWizHiringManager\(e\.target\.value\)\} placeholder=".*?" \/>',
    r'<input value={wizHiringManager} onChange={(e) => setWizHiringManager(e.target.value)} placeholder="Jay Sir" />',
    content
)

# For selects:
content = content.replace(
    '<select value={wizType} onChange={(e) => setWizType(e.target.value)}>',
    '<select value={wizType} onChange={(e) => setWizType(e.target.value)}>\n                        <option value="" disabled>Full-time</option>'
)
content = content.replace(
    '<select value={wizExp} onChange={(e) => setWizExp(e.target.value)}>',
    '<select value={wizExp} onChange={(e) => setWizExp(e.target.value)}>\n                        <option value="" disabled>2-5 years</option>'
)
content = content.replace(
    '<select value={wizDefaultDuration} onChange={(e) => setWizDefaultDuration(e.target.value)}>',
    '<select value={wizDefaultDuration} onChange={(e) => setWizDefaultDuration(e.target.value)}>\n                        <option value="" disabled>60 Minutes</option>'
)

# For textarea:
content = re.sub(
    r'<textarea value=\{wizDesc\} onChange=\{\(e\) => setWizDesc\(e\.target\.value\)\} placeholder=".*?" rows="4" style=\{\{ resize: \'vertical\' \}\}></textarea>',
    r'<textarea value={wizDesc} onChange={(e) => setWizDesc(e.target.value)} placeholder="Responsible for microservices design, REST API endpoints, and SQL queries." rows="4" style={{ resize: \'vertical\' }}></textarea>',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched employer portal.")
