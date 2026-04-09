import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async () => {
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('נרשמת! בדוק את המייל לאישור (או התחבר ישירות אם Email Confirm כבוי)')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, #1a2400 0%, transparent 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="fade-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 64,
            lineHeight: .85, letterSpacing: 2, marginBottom: 8
          }}>
            LIFT<br /><span style={{ color: 'var(--accent)' }}>TRACK</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: 1 }}>
            עקוב אחר ההתקדמות שלך
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 24, background: 'var(--card2)', borderRadius: 4, padding: 3 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700,
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? 'var(--black)' : 'var(--muted)',
                  transition: 'all .2s'
                }}>
                {m === 'login' ? 'התחברות' : 'הרשמה'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>אימייל</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>סיסמה</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>

            {error && (
              <div style={{ background: 'rgba(255,60,60,.1)', border: '1px solid rgba(255,60,60,.2)', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#ff6060' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'rgba(71,255,178,.1)', border: '1px solid rgba(71,255,178,.2)', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--accent3)' }}>
                {success}
              </div>
            )}

            <button className="btn btn-primary" onClick={handle} disabled={loading || !email || !password}
              style={{ marginTop: 4, width: '100%', padding: '12px 0', fontSize: 15 }}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : mode === 'login' ? 'התחבר' : 'צור חשבון'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
