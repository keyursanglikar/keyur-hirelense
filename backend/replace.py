import sys

with open('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove the horizontal step guidance bar
start_idx = text.find('{/* Horizontal Step Guidance Bar */}')
end_idx = text.find('{(hasCameraPermission === false || hasMicPermission === false) && (')
if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + text[end_idx:]
else:
    print('Could not find horizontal step bar bounds')

# 2. Replace staged-grid
start_grid = text.find('<div className="staged-grid">')
end_grid = text.find('</div>\n              </div>\n\n              <div style={{ display: \'flex\', justifyContent: \'space-between\', marginTop: \'32px\' }}>')

if start_grid != -1 and end_grid != -1:
    new_grid = '''<div className="staged-grid">
                {/* Left side: Test Content Area (Video / Images) */}
                <div>
                  <div className="camera-container" style={{ borderColor: cameraTestState === 'verified' ? 'var(--ok)' : (hasCameraPermission ? 'var(--amber)' : 'var(--line)') }}>
                    {hasCameraPermission ? (
                      capturedPhoto && cameraTestState !== 'untested' ? (
                         <img src={capturedPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Snapshot Preview" />
                      ) : (
                         <video 
                           ref={videoRef} 
                           autoPlay 
                           playsInline 
                           muted 
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                         ></video>
                      )
                    ) : (
                      <div className="camera-placeholder">
                        <span style={{ fontSize: '32px' }}>📷</span>
                        <span>
                          {hasCameraPermission === false ? "Camera Access Denied" : "Requesting Camera Access..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Vertical Testing Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Step 1: Camera */}
                  <div style={{ padding: '16px', border: cameraTestState === 'verified' ? '1.5px solid var(--ok)' : '1.5px solid var(--amber)', borderRadius: '12px', background: cameraTestState === 'verified' ? 'rgba(76,175,80,0.05)' : 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: cameraTestState === 'verified' ? 'var(--ok)' : '#EDF4F0' }}>Step 1: Camera Test</h4>
                      {cameraTestState === 'verified' ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Verified</span> : (hasCameraPermission ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Access Granted</span> : <span className="badge b-amber" style={{ fontSize: '10px' }}>Checking...</span>)}
                    </div>
                    
                    {cameraTestState === 'untested' && (
                      <div style={{ marginTop: '12px' }}>
                         <button className="btn primary sm" onClick={capturePhoto} disabled={!hasCameraPermission} style={{ background: 'var(--amber)', color: '#231a06', width: '100%' }}>
                           Capture Picture
                         </button>
                      </div>
                    )}
                    
                    {cameraTestState === 'captured' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>Does your picture look clear?</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn ghost sm" onClick={() => { setCapturedPhoto(null); setCameraTestState('untested'); }} style={{ flex: 1, padding: '6px 12px', fontSize: '11.5px' }}>
                            Retake
                          </button>
                          <button className="btn primary sm" onClick={() => setCameraTestState('verified')} style={{ flex: 1, padding: '6px 12px', fontSize: '11.5px', backgroundColor: 'var(--ok)', color: '#fff', borderColor: 'var(--ok)' }}>
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}

                    {cameraTestState === 'verified' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                        <button className="linkbtn" onClick={() => { setCapturedPhoto(null); setCameraTestState('untested'); }} style={{ fontSize: '11px' }}>
                          Retake Picture
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Mic */}
                  <div style={{ padding: '16px', border: micTestState === 'verified' ? '1.5px solid var(--ok)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: micTestState === 'verified' ? 'rgba(76,175,80,0.05)' : 'transparent', opacity: cameraTestState === 'verified' ? 1 : 0.8, pointerEvents: cameraTestState === 'verified' ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: cameraTestState === 'verified' ? '#EDF4F0' : 'rgba(255,255,255,0.4)' }}>Step 2: Microphone Test</h4>
                      {micTestState === 'verified' ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Verified</span> : (hasMicPermission ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Access Granted</span> : <span className="badge b-amber" style={{ fontSize: '10px' }}>Checking...</span>)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div className="vol-bars">
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                          <div
                            key={v}
                            className={`vol-bar ${micLevel >= v ? 'active' : ''}`}
                            style={{ height: `${v / 5 + 4}px` }}
                          />
                        ))}
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {micLevel > 0 ? "Mic active (sound detected)" : "Input level"}
                      </span>
                    </div>

                    {micTestState === 'untested' && (
                      <button className="btn primary sm" onClick={startMicTest} style={{ background: 'var(--amber)', color: '#231a06' }}>
                        Test Microphone
                      </button>
                    )}

                    {micTestState === 'recording' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--rec)', fontSize: '12px', fontWeight: 'bold' }}>🎤 Recording... ({micTestTimer}s)</span>
                        <span style={{ fontSize: '12px', color: '#EDF4F0' }}>Please say: "This is a microphone test."</span>
                        <button className="btn primary sm" onClick={stopMicTest} style={{ background: 'var(--rec)', color: '#fff' }}>
                          Stop Recording
                        </button>
                      </div>
                    )}

                    {micTestState === 'recorded' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <audio src={micTestUrl} controls style={{ height: '30px', flex: 1 }} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>Did you hear your recorded voice clearly?</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn ghost sm" onClick={startMicTest} style={{ padding: '6px 12px', fontSize: '11.5px' }}>
                            Record Again
                          </button>
                          <button className="btn primary sm" onClick={() => { setMicTestState('verified'); }} style={{ padding: '6px 12px', fontSize: '11.5px', backgroundColor: 'var(--ok)', color: '#fff', borderColor: 'var(--ok)' }}>
                            Yes, it sounds good ✓
                          </button>
                        </div>
                      </div>
                    )}

                    {micTestState === 'verified' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button className="linkbtn" onClick={startMicTest} style={{ fontSize: '11px' }}>
                          Retest Microphone
                        </button>
                      </div>
                    )}

                    {micTestError && (
                      <div style={{ marginTop: '8px', color: 'var(--rec)', fontSize: '12px', fontWeight: '600' }}>
                        {micTestError}
                        <button className="linkbtn" onClick={startMicTest} style={{ fontSize: '11px', marginLeft: '12px', color: 'var(--amber)' }}>
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Speaker */}
                  <div style={{ padding: '16px', border: speakerState === 'verified' ? '1.5px solid var(--ok)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: speakerState === 'verified' ? 'rgba(76,175,80,0.05)' : 'transparent', opacity: micTestState === 'verified' ? 1 : 0.8, pointerEvents: micTestState === 'verified' ? 'auto' : 'none' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px', color: micTestState === 'verified' ? '#EDF4F0' : 'rgba(255,255,255,0.4)' }}>Step 3: Speaker Test</h4>
                    {speakerState === 'untested' && (
                      <button className="btn primary sm" onClick={() => { playTestSound(); setSpeakerState('tested'); }} style={{ background: 'var(--amber)', color: '#231a06' }}>
                        🔊 Play Test Beep
                      </button>
                    )}
                    {speakerState === 'tested' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>Did you hear the test beep from your speaker/headphones?</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn ghost sm" onClick={playTestSound} style={{ padding: '6px 12px', fontSize: '11.5px' }}>
                            🔊 Replay Beep
                          </button>
                          <button className="btn primary sm" onClick={() => setSpeakerState('verified')} style={{ padding: '6px 12px', fontSize: '11.5px', backgroundColor: 'var(--ok)', color: '#fff', borderColor: 'var(--ok)' }}>
                            Yes, I heard it ✓
                          </button>
                        </div>
                      </div>
                    )}
                    {speakerState === 'verified' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge b-ok">✓ Speaker Verified</span>
                        <button className="linkbtn" onClick={() => { playTestSound(); setSpeakerState('tested'); }} style={{ fontSize: '11px' }}>
                          Retest
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Network */}
                  <div style={{ padding: '16px', border: latency !== null ? '1.5px solid var(--ok)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: latency !== null ? 'rgba(76,175,80,0.05)' : 'transparent', opacity: speakerState === 'verified' ? 1 : 0.8 }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px', color: speakerState === 'verified' ? '#EDF4F0' : 'rgba(255,255,255,0.4)' }}>Step 4: Network Test</h4>
                    <span className={`badge ${
                      latency === null ? 'b-mute' :
                      latency < 100 ? 'b-ok' :
                      latency < 250 ? 'b-amber' : 'b-rec'
                    }`}>
                      {networkStatus}
                    </span>
                  </div>

                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
'''
    text = text[:start_grid] + new_grid + text[end_grid:]
    with open('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'w', encoding='utf-8') as out:
        out.write(text)
    print('Replaced successfully')
else:
    print('Could not find grid bounds')
