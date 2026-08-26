import sys

with open('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_s5 = text.find('{screen === 5 && (')
end_s5 = text.find('{/* ================= SCREEN 6')

if start_s5 == -1 or end_s5 == -1:
    print("Bounds not found")
    sys.exit(1)

old_s5 = text[start_s5:end_s5]

new_s5 = '''{screen === 5 && (
            <div className="c-card">
              <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>DEVICE CALIBRATION &amp; PRE-FLIGHT CHECKLIST</span>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', marginBottom: '8px' }}>Webcam, Audio &amp; Identity Verification</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '20px' }}>Follow the 4 steps below in order to calibrate your hardware before starting your AI interview.</p>

              {/* Horizontal Step Guidance Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {/* Step 1: Camera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: cameraTestState === 'verified' ? 'var(--ok)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cameraTestState === 'verified' ? '✓' : '1'}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: cameraTestState === 'verified' ? 'var(--ok)' : '#EDF4F0' }}>1. Camera</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>

                {/* Step 2: Mic */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: micTestState === 'verified' ? 'var(--ok)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {micTestState === 'verified' ? '✓' : '2'}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: micTestState === 'verified' ? 'var(--ok)' : '#EDF4F0' }}>2. Microphone</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>

                {/* Step 3: Speaker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: speakerState === 'verified' ? 'var(--ok)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {speakerState === 'verified' ? '✓' : '3'}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: speakerState === 'verified' ? 'var(--ok)' : '#EDF4F0' }}>3. Speaker</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>

                {/* Step 4: Network */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: latency !== null ? 'var(--ok)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {latency !== null ? '✓' : '4'}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: latency !== null ? 'var(--ok)' : '#EDF4F0' }}>4. Network</span>
                </div>
              </div>

              {(hasCameraPermission === false || hasMicPermission === false) && (
                <div style={{
                  background: 'var(--rec-soft)',
                  border: '1.5px solid rgba(235, 94, 85, 0.2)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  color: 'var(--rec)'
                }}>
                  <span style={{ fontSize: '18px', marginTop: '-2px' }}>⚠️</span>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                      {hasCameraPermission === false && hasMicPermission === false ? "Camera and Microphone Access Blocked" :
                       hasCameraPermission === false ? "Camera Access Blocked" : "Microphone Access Blocked"}
                    </strong>
                    Please click the camera/microphone icon in your browser's address bar to allow permissions for this page, then click the button below to reconnect. Both devices are strictly required to start the assessment.

                    <button
                      className="btn sm"
                      onClick={() => {
                        setHasCameraPermission(null);
                        setHasMicPermission(null);
                        stopCamera();
                        setTimeout(() => {
                          startCamera();
                        }, 50);
                      }}
                      style={{
                        marginTop: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--rec)',
                        color: '#fff',
                        borderColor: 'var(--rec)',
                        fontWeight: '700',
                        fontSize: '12px',
                        padding: '6px 14px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔄 Reconnect Camera &amp; Microphone
                    </button>
                  </div>
                </div>
              )}

              <div className="staged-grid">
                {/* Left side: Active Test Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Step 1: Camera Test Controls (Active when not verified) */}
                  {cameraTestState !== 'verified' && (
                  <div style={{ padding: '16px', border: '1.5px solid var(--amber)', borderRadius: '12px', background: 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: '#EDF4F0' }}>Step 1: Camera Test</h4>
                      {hasCameraPermission ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Access Granted</span> : <span className="badge b-amber" style={{ fontSize: '10px' }}>Checking...</span>}
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                      Please ensure your face is clearly visible in the camera preview on the right, then capture a verification picture.
                    </p>
                    
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
                          <button className="btn ghost sm" onClick={() => { setCapturedPhoto(null); setCameraTestState('untested'); startCamera(); }} style={{ flex: 1, padding: '6px 12px', fontSize: '11.5px' }}>
                            Retake
                          </button>
                          <button className="btn primary sm" onClick={() => { setCameraTestState('verified'); stopCamera(); }} style={{ flex: 1, padding: '6px 12px', fontSize: '11.5px', backgroundColor: 'var(--ok)', color: '#fff', borderColor: 'var(--ok)' }}>
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Step 2: Microphone Test Controls (Active when Camera is verified but Mic is not) */}
                  {cameraTestState === 'verified' && micTestState !== 'verified' && (
                  <div style={{ padding: '16px', border: '1.5px solid var(--amber)', borderRadius: '12px', background: 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: '#EDF4F0' }}>Step 2: Microphone Test</h4>
                      {hasMicPermission ? <span className="badge b-ok" style={{ fontSize: '10px' }}>✓ Access Granted</span> : <span className="badge b-amber" style={{ fontSize: '10px' }}>Checking...</span>}
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

                    {micTestError && (
                      <div style={{ marginTop: '8px', color: 'var(--rec)', fontSize: '12px', fontWeight: '600' }}>
                        {micTestError}
                        <button className="linkbtn" onClick={startMicTest} style={{ fontSize: '11px', marginLeft: '12px', color: 'var(--amber)' }}>
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Step 3: Speaker Test Controls (Active when Mic is verified but Speaker is not) */}
                  {cameraTestState === 'verified' && micTestState === 'verified' && speakerState !== 'verified' && (
                  <div style={{ padding: '16px', border: '1.5px solid var(--amber)', borderRadius: '12px', background: 'transparent' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px', color: '#EDF4F0' }}>Step 3: Speaker Test</h4>
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
                  </div>
                  )}

                  {/* Step 4: Network Test Controls (Active when Speaker is verified) */}
                  {cameraTestState === 'verified' && micTestState === 'verified' && speakerState === 'verified' && latency === null && (
                  <div style={{ padding: '16px', border: '1.5px solid var(--amber)', borderRadius: '12px', background: 'transparent' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px', color: '#EDF4F0' }}>Step 4: Network Test</h4>
                    <span className="badge b-amber">Checking...</span>
                  </div>
                  )}
                  
                  {/* All Verified State */}
                  {cameraTestState === 'verified' && micTestState === 'verified' && speakerState === 'verified' && latency !== null && (
                  <div style={{ padding: '24px', border: '1.5px solid var(--ok)', borderRadius: '12px', background: 'rgba(76,175,80,0.05)', textAlign: 'center' }}>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>✅</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ok)' }}>All Hardware Checks Complete</h4>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>Your setup is optimal for the AI interview.</p>
                  </div>
                  )}
                  
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                </div>

                {/* Right side: Test Content Area (Video / Images) */}
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
                  
                  {cameraTestState === 'verified' && (
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <button className="linkbtn" onClick={() => { setCapturedPhoto(null); setCameraTestState('untested'); startCamera(); }} style={{ fontSize: '12px', color: 'var(--amber)' }}>
                        🔄 Retake Profile Snapshot
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button className="btn ghost" onClick={() => setScreen(4)}>← Back</button>
                <button className="btn primary" onClick={handleSaveAndContinue} disabled={!(hasCameraPermission && hasMicPermission && cameraTestState === 'verified' && micTestState === 'verified' && speakerState === 'verified' && capturedPhoto)} style={{ background: (hasCameraPermission && hasMicPermission && cameraTestState === 'verified' && micTestState === 'verified' && speakerState === 'verified' && capturedPhoto) ? 'var(--ok)' : 'rgba(255,255,255,0.1)', color: (hasCameraPermission && hasMicPermission && cameraTestState === 'verified' && micTestState === 'verified' && speakerState === 'verified' && capturedPhoto) ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                  Save &amp; Continue →
                </button>
              </div>
            </div>
          )}
'''

text = text[:start_s5] + new_s5 + text[end_s5:]

with open('../modules/Hirelens/hirelense/frontend/src/apps/candidate-flow/src/CandidateFlow.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Rewrote Screen 5 layout")
