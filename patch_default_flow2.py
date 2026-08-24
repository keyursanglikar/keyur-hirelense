import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\employer-portal\src\EmployerPortal.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We already replaced the buttons and the collapse thing. Let's make sure.
# Now let's fix the template item map block.

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
                                  // triggerToast(defaultFlowId === t.id ? "Already default flow." : "Set as default flow.");
                                }}
                              >
                                {defaultFlowId === t.id ? 'Default' : 'Set as Default'}
                              </button>
                            </span>'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Flow default changes applied 2.")
