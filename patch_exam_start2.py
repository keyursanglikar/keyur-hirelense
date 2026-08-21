import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\candidate-flow\src\CandidateFlow.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_screen_75 = '''
          {/* ================= SCREEN 75: EXAM COUNTDOWN ================= */}
          {screen === 75 && (
            <div className="c-card" style={{ maxWidth: '480px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(239, 176, 54, 0.1)', border: '2px solid var(--amber)', display: 'grid', placeItems: 'center', margin: '0 auto 24px auto', position: 'relative' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--amber)' }}>{examStartTimer}</span>
                <svg style={{ position: 'absolute', top: '-2px', left: '-2px', width: '84px', height: '84px', transform: 'rotate(-90deg)' }}>
                  <circle cx="42" cy="42" r="40" fill="none" stroke="var(--amber)" strokeWidth="4" strokeDasharray="251" strokeDashoffset={251 - (251 * (examStartTimer / 10))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', margin: '0 0 12px 0' }}>Get Ready</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14.5px', marginBottom: '0', lineHeight: 1.5 }}>
                Your exam will start in {examStartTimer} seconds.<br />Please ensure you are sitting comfortably and looking at the camera.
              </p>
            </div>
          )}

          {/* ================= SCREEN 8: AI INTERVIEW (LIVE STAGE) ================= */}'''

content = re.sub(r'\{\/\*\s*=================\s*SCREEN 8:\s*AI INTERVIEW \(LIVE STAGE\)\s*=================\s*\*\/\s*\}', new_screen_75.replace('\\', '\\\\'), content, count=1)

old_skip_regex = r'<button className="btn primary" disabled style=\{\{\s*width:\s*\'100%\',\s*height:\s*\'48px\',\s*fontSize:\s*\'14px\',\s*cursor:\s*\'not-allowed\'\s*\}\}>\s*\{isAudioPlaying \? \'Listening to Question\.\.\.\' : Thinking Time \(0:\$\{String\(questionTimer\)\.padStart\(2, \'0\'\)\}\)\}\s*<\/button>'

new_skip_button = '''<button 
                            className="btn primary" 
                            disabled={isAudioPlaying || questionTimer > 10} 
                            onClick={() => {
                              setQuestionTimer(1); 
                            }}
                            style={{ 
                              width: '100%', 
                              height: '48px', 
                              fontSize: '14px', 
                              cursor: (isAudioPlaying || questionTimer > 10) ? 'not-allowed' : 'pointer',
                              backgroundColor: (isAudioPlaying || questionTimer > 10) ? 'rgba(255,255,255,0.1)' : 'var(--amber)',
                              color: (isAudioPlaying || questionTimer > 10) ? 'rgba(255,255,255,0.3)' : 'var(--deep)',
                              fontWeight: '700'
                            }}
                          >
                            {isAudioPlaying ? 'Listening to Question...' : (questionTimer > 10 ? Thinking Time (0:) : Skip to Answer (0:))}
                          </button>'''

content = re.sub(old_skip_regex, new_skip_button.replace('\\', '\\\\'), content, count=1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch 2 applied!")
