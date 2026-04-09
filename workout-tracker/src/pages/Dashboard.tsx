import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { WorkoutSession } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface PRMap { [exercise: string]: number }

export default function Dashboard() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [prs, setPRs] = useState<PRMap>({})
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [thisWeek, setThisWeek] = useState(0)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchSessions(), fetchPRs()]).finally(() => setLoading(false))
  }, [user])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(30)
    if (!data) return
    setSessions(data)

    // Streak calculation
    let s = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dates = [...new Set(data.map(d => d.date))].sort((a, b) => b.localeCompare(a))
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]); d.setHours(0, 0, 0, 0)
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
      if (diff === i || diff === i + 1) s++
      else break
    }
    setStreak(s)

    // This week count
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    setThisWeek(data.filter(sess => new Date(sess.date) >= weekAgo).length)
  }

  // FIX 4: simpler PR query - get all sessions first, then sets
  const fetchPRs = async () => {
    // Get all session IDs for this user
    const { data: sessionIds } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user!.id)
    if (!sessionIds || sessionIds.length === 0) return

    const ids = sessionIds.map(s => s.id)
    const { data: sets } = await supabase
      .from('session_sets')
      .select('exercise_name, weight_kg')
      .in('session_id', ids)
      .eq('completed', true)
    if (!sets) return

    const map: PRMap = {}
    sets.forEach((s: any) => {
      if (!map[s.exercise_name] || s.weight_kg > map[s.exercise_name])
        map[s.exercise_name] = s.weight_kg
    })
    setPRs(map)
  }

  const recentSessions = sessions.slice(0, 5)
  const prList = Object.entries(prs).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="page-wrap fade-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 1, lineHeight: 1, marginBottom: 6 }}>
          שלום 👋 <span style={{ color: 'var(--accent)' }}>{user?.email?.split('@')[0]}</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { val: sessions.length, label: 'סה"כ אימונים',   color: 'var(--accent)' },
              { val: thisWeek,        label: 'אימונים השבוע',   color: 'var(--accent3)' },
              { val: `${streak}🔥`,   label: 'streak (ימים)',   color: 'var(--accent2)' },
              { val: Object.keys(prs).length, label: 'שיאים אישיים', color: 'var(--blue)' },
            ].map(({ val, label, color }) => (
              <div key={label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: color }} />
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* FIX 5: responsive 2-col grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {/* Recent sessions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="sec-title" style={{ margin: 0 }}>אימונים אחרונים</div>
                <Link to="/history" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>הכל ←</Link>
              </div>
              {recentSessions.length === 0 ? (
                <div className="empty" style={{ padding: '24px 0' }}>
                  <div className="empty-icon">🏋️</div>
                  עדיין אין אימונים.<br />
                  <Link to="/workout" style={{ color: 'var(--accent)', fontWeight: 700 }}>התחל אימון ראשון →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentSessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--card2)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.plan_name || 'אימון חופשי'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(s.date).toLocaleDateString('he-IL')}
                          {s.duration_minutes ? ` · ${s.duration_minutes} דק׳` : ''}
                        </div>
                      </div>
                      <span className="tag tag-yellow">✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRs */}
            <div className="card">
              <div className="sec-title">🏆 שיאים אישיים</div>
              {prList.length === 0 ? (
                <div className="empty" style={{ padding: '24px 0' }}>
                  <div className="empty-icon">🎯</div>
                  התחל לאמן כדי לצבור שיאים
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prList.map(([ex, weight]) => (
                    <div key={ex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--card2)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ex}</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: 'var(--accent)' }}>
                        {weight} <span style={{ fontSize: 11, color: 'var(--muted)' }}>ק"ג</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick start */}
          <div style={{ marginTop: 20, padding: '20px 24px', background: 'linear-gradient(135deg,rgba(232,255,71,.08),rgba(232,255,71,.02))', border: '1px solid rgba(232,255,71,.15)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, marginBottom: 4 }}>מוכן לאימון?</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>בחר תוכנית והתחל לעקוב</div>
            </div>
            <Link to="/workout" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>
              ⚡ התחל אימון
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
