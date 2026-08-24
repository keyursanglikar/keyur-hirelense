import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\candidate-flow\src\CandidateFlow.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_vars = "const [showExpiredModal, setShowExpiredModal] = useState(false);\n  const [expiredMessage, setExpiredMessage] = useState('');"
if "showExpiredModal" not in content:
    content = content.replace("const [showCameraModal, setShowCameraModal] = useState(false);", "const [showCameraModal, setShowCameraModal] = useState(false);\n  " + state_vars)

# 2. Modify handleCandidateLogin
old_catch = '''    } catch (err) {
      console.error(err);
      triggerToast({ bold: "Access Denied:", normal: err.message || "Invalid Student ID or Email ID." }, true);
    }'''

new_catch = '''    } catch (err) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('expired')) {
        setExpiredMessage(err.message);
        setShowExpiredModal(true);
      } else {
        triggerToast({ bold: "Access Denied:", normal: err.message || "Invalid Student ID or Email ID." }, true);
      }
    }'''
content = content.replace(old_catch, new_catch)

# 3. Add modal JSX right before the end of cand-app
modal_jsx = '''
      {/* Expired Link Modal */}
      {showExpiredModal && (
        <div style={{ display: 'grid', position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', placeItems: 'center', zIndex: 1000 }}>
          <div className="c-card" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px', margin: '0 20px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--line-soft)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--red-soft)', color: 'var(--red)', display: 'grid', placeItems: 'center', margin: '0 auto 16px auto', fontSize: '28px', border: '4px solid #fff' }}>
              ✕
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)', marginBottom: '12px' }}>Link Expired</h3>
            <p style={{ fontSize: '14.5px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '24px' }}>
              {expiredMessage || "Your interview invitation link has expired. Please contact the employer for a new link."}
            </p>
            <button className="btn primary" onClick={() => setShowExpiredModal(false)} style={{ width: '100%', height: '44px', fontSize: '15px' }}>
              Close
            </button>
          </div>
        </div>
      )}
'''

if "showExpiredModal && (" not in content:
    content = content.replace("    </div>\n  );\n}", modal_jsx + "    </div>\n  );\n}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Expired link modal added.")
