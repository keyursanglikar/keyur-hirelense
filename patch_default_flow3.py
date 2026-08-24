import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\employer-portal\src\EmployerPortal.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'const [defaultFlowId' not in content:
    content = content.replace(
        'const [wizAttachedFlowId, setWizAttachedFlowId] = useState(null);',
        'const [wizAttachedFlowId, setWizAttachedFlowId] = useState(null);\n    const [defaultFlowId, setDefaultFlowId] = useState(() => parseInt(localStorage.getItem(\'defaultFlowId\')) || null);'
    )

old_buttons = '''                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn ghost sm" onClick={() => setWizSearchFlowOpen(true)}>Search Templates</button>
                            <button className="btn primary sm" onClick={() => {
                              const defFlow = templates[0] || { id: 1 };
                              setWizAttachedFlowId(defFlow.id);
                              triggerToast("Attached Default Flow.");
                            }}>Use Default Flow</button>
                            <button className="btn ghost sm" onClick={() => {
                              setFlowWizEditingId(null);
                              const defaultRounds = [{ id: Date.now(), type: 'hr', name: 'HR Screening', description: 'Initial screening round', questions: [] }];
                              setFlowWizRounds(defaultRounds);
                              setFlowWizName('');
                              setFlowWizTitle(wizTitle);
                              setFlowWizDept(wizDept);
                              setFlowWizDesc(wizDesc);
                              setFlowWizTab('rounds');
                              setFlowWizModel('sonnet');
                              setFlowWizStep(1);
                              setFlowWizOriginalData({
                                name: '',
                                jobTitle: wizTitle,
                                department: wizDept,
                                description: wizDesc,
                                rounds: defaultRounds,
                                ai_model: 'sonnet'
                              });
                              setFlowWizOpen(true);
                            }}>Create New Flow</button>
                            <button className="btn ghost sm" onClick={() => setWizSearchFlowOpen(true)}>Attach Existing Flow</button>
                          </div>'''

new_buttons = '''                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn primary sm" onClick={() => {
                              if (defaultFlowId && templates.find(t => t.id === defaultFlowId)) {
                                setWizAttachedFlowId(defaultFlowId);
                                triggerToast("Attached Default Flow.");
                              } else if (templates.length > 0) {
                                setWizAttachedFlowId(templates[0].id);
                                setDefaultFlowId(templates[0].id);
                                localStorage.setItem('defaultFlowId', templates[0].id);
                                triggerToast("Attached Default Flow.");
                              } else {
                                triggerToast({ bold: "Error:", normal: "No flows available to set as default." }, true);
                              }
                            }}>Use Default Flow</button>
                            <button className="btn ghost sm" onClick={() => {
                              setFlowWizEditingId(null);
                              const defaultRounds = [{ id: Date.now(), type: 'hr', name: 'HR Screening', description: 'Initial screening round', questions: [] }];
                              setFlowWizRounds(defaultRounds);
                              setFlowWizName('');
                              setFlowWizTitle(wizTitle);
                              setFlowWizDept(wizDept);
                              setFlowWizDesc(wizDesc);
                              setFlowWizTab('rounds');
                              setFlowWizModel('sonnet');
                              setFlowWizStep(1);
                              setFlowWizOriginalData({
                                name: '',
                                jobTitle: wizTitle,
                                department: wizDept,
                                description: wizDesc,
                                rounds: defaultRounds,
                                ai_model: 'sonnet'
                              });
                              setFlowWizOpen(true);
                            }}>Create New Flow</button>
                          </div>'''

content = content.replace(old_buttons, new_buttons)

pattern = r'<input type="radio" name="wt" checked=\{wizAttachedFlowId === t\.id\} readOnly \/>.*?<\/small>\s*<\/span>'
replacement = '''<input type="radio" name="wt" checked={wizAttachedFlowId === t.id} readOnly />
                            <span className="grow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                  <b>{t.name}</b>
                                  <span className={match-badge }>{score}% Match</span>
                                </span>
                                <small>{t.description} · Calculated duration: <b>{getFlowCalculatedDuration(t)} mins</b></small>
                              </div>
                              <button 
                                className={tn sm } 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDefaultFlowId(t.id);
                                  localStorage.setItem('defaultFlowId', t.id);
                                }}
                              >
                                {defaultFlowId === t.id ? 'Default' : 'Set as Default'}
                              </button>
                            </span>'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

content = content.replace('{(!wizAttachedFlowId || wizSearchFlowOpen) && (', '{true && (')
content = content.replace('{wizSearchFlowOpen && <button className="linkbtn" onClick={() => setWizSearchFlowOpen(false)}>Collapse List</button>}', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
