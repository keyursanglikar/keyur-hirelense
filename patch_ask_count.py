import re
file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\employer-portal\src\EmployerPortal.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement_str = r"({flowWizRounds[flowWizSelectedRoundIdx]?.questions?.length || 0} Questions)\n                              </span>\n                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>\n                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>Ask candidates:</span>\n                                <select \n                                  className=\"\"\n                                  style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', padding: '2px 4px' }}\n                                  value={flowWizRounds[flowWizSelectedRoundIdx]?.ask_count || flowWizRounds[flowWizSelectedRoundIdx]?.questions?.length || 1}\n                                  onChange={(e) => {\n                                    const updated = [...flowWizRounds];\n                                    updated[flowWizSelectedRoundIdx].ask_count = Number(e.target.value);\n                                    setFlowWizRounds(updated);\n                                  }}\n                                >\n                                  {Array.from({length: Math.max(1, flowWizRounds[flowWizSelectedRoundIdx]?.questions?.length || 1)}, (_, i) => i + 1).map(num => (\n                                    <option key={num} value={num}>{num} randomly</option>\n                                  ))}\n                                </select>\n                              </div>"

# Use regex to replace
content = re.sub(
    r'\(\{flowWizRounds\[flowWizSelectedRoundIdx\]\?\.questions\?\.length \|\| 0\} Questions\)\n\s*<\/span>',
    replacement_str.replace('\\', '\\\\'),
    content,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("UI patched successfully!")
