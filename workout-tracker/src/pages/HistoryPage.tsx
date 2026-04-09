import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutSession, SessionSet } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface SessionWithSets extends WorkoutSession { sets: SessionSet[] }

export default function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionWithSets[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedEx, setSelectedEx] = useState<string>('')
  const [exercises, setExercises] = useState<string[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => { fetchHistory() }, [user])

  // FIX 6: single query for all sets, not N+1
  const fetchHistory = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: sess, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50)

      if (error || !sess) { setLoading(false); return }

      // Fetch ALL sets for all sessions in ONE query
      const sessionIds = sess.map(s => s.id)
      const { data: allSets } = await supabase
        .from('session_sets')
        .select('*')
        .in('session_id', sessionIds)
        .order('set_number')

      // Group sets by session_id
      const setsMap: { [id: string]: SessionSet[] } = {}
      ;(allSets || []).forEach((s: SessionSet) => {
        if (!setsMap[s.session_id]) setsMap[s.session_id] = []
        setsMap[s.session_id].push(s)
      })

      const withSets: SessionWithSets[] = sess.map(s => ({ ...s, sets: setsMap[s.id] || [] }))
      setSessions(withSets)

      const exNames = [...new Set((allSets || []).map((s: SessionSet) => s.exercise_name))].sort()
      setExercises(exNames)
      if (exNames.length) setSelectedEx(ex => ex || exNames[0])
    } finally {
      setLoading(false)
    }
  }

  // Build chart whenever exercise or sessions change
  useEffect(() => {
    if (!selectedEx || sessions.length === 0) return
    const pts: { date: string; weight: number }[] = []
    sessions.slice().reverse().forEach(sess => {
      const exSets = sess.sets.filter(s => s.exercise_name === selectedEx && s.completed)
      if (exSets.length) {
        const maxWeight = Math.max(...exSets.map(s => s.weight_kg))
        pts.push({
          date: new Date(sess.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
          weight: maxWeight
        })
      }
    })
    setChartData(pts)
  }, [selectedEx, sessions])

  const deleteSession = async (id: string) => {
    if (!confirm('למחוק אימון זה?')) return
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
    if (!error) setSessions(s => s.filter(x => x.id !== id))
  }

  const pr = chartData.length ? Math.max(...chartData.map(d => d.weight)) : null

  return (
    <div className="page-wrap fade-up">
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 1, marginBottom: 8 }}>
        היסטוריה <span style={{ color: 'var(--accent)' }}>+ גרפים</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>מעקב התקדמות לאורך זמן</div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📊</div>
          אין אימונים עדיין. התחל לאמן!
        </div>
      ) : (
        <>
          {/* Chart */}
          {exercises.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22 }}>📈 גרף התקדמות</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {pr !== null && (
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: 'var(--accent)' }}>
                      PR: {pr} ק"ג 🏆
                    </div>
                  )}
                  <select value={selectedEx} onChange={e => setSelectedEx(e.target.value)}
                    style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}>
                    {exercises.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              {chartData.length < 2 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                  צריך לפחות 2 אימונים עם "{selectedEx}" לגרף
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} unit=" ק״ג" />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 12 }}
                      labelStyle={{ color: '#e8ff47', fontWeight: 700 }}
                      formatter={(val: any) => [`${val} ק"ג`, 'משקל מקסימלי']}
                    />
                    <Line type="monotone" dataKey="weight" stroke="#e8ff47" strokeWidth={2}
                      dot={{ fill: '#e8ff47', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Sessions list */}
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, marginBottom: 14 }}>
            אימונים ({sessions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map(sess => (
              <div key={sess.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === sess.id ? null : sess.id)}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                      {sess.plan_name || 'אימון חופשי'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>📅 {new Date(sess.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      {sess.duration_minutes ? <span>⏱ {sess.duration_minutes} דק׳</span> : null}
                      <span>📊 {sess.sets.length} סטים</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-danger btn-sm"
                      onClick={e => { e.stopPropagation(); deleteSession(sess.id) }}>🗑️</button>
                    <span style={{ color: 'var(--muted)', fontSize: 16 }}>{expandedId === sess.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === sess.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px' }}>
                    {sess.notes && (
                      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14, fontStyle: 'italic' }}>
                        "{sess.notes}"
                      </div>
                    )}
                    {[...new Set(sess.sets.map(s => s.exercise_name))].map(exName => {
                      const exSets = sess.sets.filter(s => s.exercise_name === exName)
                      return (
                        <div key={exName} style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{exName}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {exSets.map((s, i) => (
                              <div key={i} style={{
                                background: s.completed ? 'var(--accent-dim)' : 'var(--card2)',
                                border: `1px solid ${s.completed ? 'rgba(232,255,71,.25)' : 'var(--border)'}`,
                                borderRadius: 3, padding: '4px 10px', fontSize: 12,
                                fontFamily: "'JetBrains Mono',monospace",
                                color: s.completed ? 'var(--accent)' : 'var(--muted)'
                              }}>
                                {s.weight_kg}kg × {s.reps}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
