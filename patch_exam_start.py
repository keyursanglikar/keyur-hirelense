import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\candidate-flow\src\CandidateFlow.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
if 'const [examStartTimer, setExamStartTimer] = useState(10);' not in content:
    content = content.replace(
        'const [questionTimer, setQuestionTimer] = useState(15);',
        'const [questionTimer, setQuestionTimer] = useState(15);\n  const [examStartTimer, setExamStartTimer] = useState(10);'
    )

# 2. Modify handleBeginRound
old_handleBeginRound = '''  const handleBeginRound = async () => {
    if (currentRoundIdx === 0) {
      await handleStartSession(candidateData.id);
    }
    const currentRound = roundsList[currentRoundIdx];
    if (currentRound && (currentRound.id === 'case' || currentRound.type === 'case')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 5), 0) || 5;
      const totalSeconds = totalMinutes * 60;
      const readSeconds = Math.min(Math.max(Math.floor(totalSeconds / 3), 45), 180);
      
      setCaseStudyStage('reading');
      setCaseReadingTimer(readSeconds);
      setMaxCaseReadingTime(readSeconds);
      setIsAudioPlaying(true);
      setScreen(10);
    } else if (currentRound && (currentRound.id === 'mcq' || currentRound.type === 'mcq')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 8), 0) || 8;
      setMcqTimer(totalMinutes * 60);
      setScreen(11);
    } else {
      setScreen(8);
      setSpeakingState('asking');
      setQuestionTimer(15);
      setAnswerTimer(getQuestionTimeLimitSeconds(currentRoundIdx, 0));
      setIsAnswering(false);
      setIsAudioPlaying(true);
    }
  };'''

new_handleBeginRound = '''  const handleBeginRound = async () => {
    if (currentRoundIdx === 0) {
      await handleStartSession(candidateData.id);
      setScreen(75);
      setExamStartTimer(10);
    } else {
      proceedToRound();
    }
  };

  const proceedToRound = () => {
    const currentRound = roundsList[currentRoundIdx];
    if (currentRound && (currentRound.id === 'case' || currentRound.type === 'case')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 5), 0) || 5;
      const totalSeconds = totalMinutes * 60;
      const readSeconds = Math.min(Math.max(Math.floor(totalSeconds / 3), 45), 180);
      
      setCaseStudyStage('reading');
      setCaseReadingTimer(readSeconds);
      setMaxCaseReadingTime(readSeconds);
      setIsAudioPlaying(true);
      setScreen(10);
    } else if (currentRound && (currentRound.id === 'mcq' || currentRound.type === 'mcq')) {
      const totalMinutes = currentRound.questions?.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 8), 0) || 8;
      setMcqTimer(totalMinutes * 60);
      setScreen(11);
    } else {
      setScreen(8);
      setSpeakingState('asking');
      setQuestionTimer(15);
      setAnswerTimer(getQuestionTimeLimitSeconds(currentRoundIdx, 0));
      setIsAnswering(false);
      setIsAudioPlaying(true);
    }
  };'''

if old_handleBeginRound in content:
    content = content.replace(old_handleBeginRound, new_handleBeginRound)
else:
    print("Warning: old_handleBeginRound not found!")

# 3. Add to useEffect timer logic
old_use_effect_timer = '''      }, 1000);
    } else if (screen === 8) {'''

new_use_effect_timer = '''      }, 1000);
    } else if (screen === 75) {
      if (examStartTimer > 0) {
        timerIntervalRef.current = setInterval(() => {
          setExamStartTimer(prev => prev - 1);
        }, 1000);
      } else {
        proceedToRound();
      }
    } else if (screen === 8) {'''

if old_use_effect_timer in content:
    content = content.replace(old_use_effect_timer, new_use_effect_timer)
else:
    print("Warning: old_use_effect_timer not found!")

# 4. Add Screen 75 UI
old_screen_7_end = '''            )}
  
            {/* ================= SCREEN 8: AI INTERVIEW (LIVE STAGE) ================= */}'''

new_screen_75 = '''            )}

            {/* ================= SCREEN 75: EXAM COUNTDOWN ================= */}
            {screen === 75 && (
              <div className="c-card" style={{ maxWidth: '480px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(239, 176, 54, 0.1)', border: '2px solid var(--amber)', display: 'grid', placeItems: 'center', margin: '0 auto 24px auto', position: 'relative' }}>
                  <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--amber)' }}>{examStartTimer}</span>
                  <svg style={{ position: 'absolute', top: '-2px', left: '-2px', width: '84px', height: '84px', transform: 'rotate(-90deg)' }}>
                    <circle cx="42" cy="42" r="40" fill="none" stroke="var(--amber)" strokeWidth="4" strokeDasharray="251" strokeDashoffset={251 - (251 * (examStartTimer / 10))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', marginBottom: '12px' }}>Get Ready</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14.5px', marginBottom: '0', lineHeight: 1.5 }}>
                  Your exam will start in {examStartTimer} seconds.<br />Please ensure you are sitting comfortably and looking at the camera.
                </p>
              </div>
            )}
  
            {/* ================= SCREEN 8: AI INTERVIEW (LIVE STAGE) ================= */}'''

if old_screen_7_end in content:
    content = content.replace(old_screen_7_end, new_screen_75)
else:
    print("Warning: old_screen_7_end not found!")

# 5. Modify skip button UI
old_skip_button = '''                            <button className="btn primary" disabled style={{ width: '100%', height: '48px', fontSize: '14px', cursor: 'not-allowed' }}>
                              {isAudioPlaying ? 'Listening to Question...' : Thinking Time (0:)}
                            </button>'''

new_skip_button = '''                            <button 
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

if old_skip_button in content:
    content = content.replace(old_skip_button, new_skip_button)
else:
    print("Warning: old_skip_button not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully!")
