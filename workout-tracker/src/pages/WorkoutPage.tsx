import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Plan, PlanExercise } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

interface LiveSet { weight: number; reps: number; done: boolean }
interface LiveExercise { exercise: PlanExercise; sets: LiveSet[] }

export default function WorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, showToast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [liveExs, setLiveExs] = useState<LiveExercise[]>([])
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restActive, setRestActive] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (restRef.current)  clearInterval(restRef.current)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [user])

  useEffect(() => {
    if (started) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started])

  const fetchPlans = async () => {
    if (!user) return
    const { data } = await supabase.from('plans').select('*').eq('user_id', user.id).order('created_at')
    setPlans(data || [])
  }

  const startWorkout = async (plan: Plan) => {
    const { data: exs } = await supabase.from('plan_exercises').select('*').eq('plan_id', plan.id).order('sort_order')
    const live: LiveExercise[] = (exs || []).map(ex => ({
      exercise: ex,
      sets: Array.from({ length: ex.sets }, () => ({ weight: 0, reps: parseInt(ex.reps) || 10, done: false }))
    }))
    setLiveExs(live); setSelectedPlan(plan); setStarted(true); setElapsed(0)
  }

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  const updateSet = (exIdx: number, setIdx: number, key: 'weight' | 'reps', val: number) => {
    setLiveExs(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [key]: val })
    }))
  }

  const toggleSet = (exIdx: number, setIdx: number, restSecs: number) => {
    let markingDone = false
    setLiveExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return { ...ex, sets: ex.sets.map((s, j) => {
        if (j !== setIdx) return s
        markingDone = !s.done
        return { ...s, done: !s.done }
      })}
    }))
    if (markingDone) {
      if (restRef.current) clearInterval(restRef.current)
      setRestTimer(restSecs); setRestActive(true)
      restRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t === null || t <= 1) { clearInterval(restRef.current!); setRestActive(false); return null }
          return t - 1
        })
      }, 1000)
    }
  }

  const skipRest = () => { if (restRef.current) clearInterval(restRef.current); setRestActive(false); setRestTimer(null) }

  const finishWorkout = async () => {
    if (!selectedPlan) return
    setSaving(true)
    try {
      const { data: session, error } = await supabase.from('workout_sessions').insert({
        user_id: user!.id, plan_id: selectedPlan.id, plan_name: selectedPlan.name,
        date: new Date().toISOString().split('T')[0],
        duration_minutes: Math.round(elapsed / 60) || 1,
        notes: notes || null
      }).select().single()
      if (error) throw error
      if (session) {
        const sets: any[] = []
        liveExs.forEach(lex => lex.sets.forEach((s, idx) => {
          sets.push({ session_id: session.id, exercise_name: lex.exercise.exercise_name, set_number: idx + 1, weight_kg: s.weight, reps: s.reps, completed: s.done })
        }))
        if (sets.length) { const { error: e } = await supabase.from('session_sets').insert(sets); if (e) throw e }
      }
      showToast('אימון נשמר! 💪')
      setTimeout(() => navigate('/history'), 1500)
    } catch (e: any) { showToast(e?.message || 'שגיאה בשמירה', 'error') }
    setSaving(false)
  }

  const totalSets = liveExs.reduce((a, e) => a + e.sets.length, 0)
  const doneSets  = liveExs.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)
  const progress  = totalSets ? Math.round((doneSets / totalSets) * 100) : 0

  if (!started) {
    return (
      <div className="page-wrap fade-up">
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:1, marginBottom:6 }}>
          ⚡ <span style={{ color:'var(--accent)' }}>התחל</span> אימון
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:24 }}>בחר תוכנית להתחיל</div>
        {plans.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon">📋</div>
            אין תוכניות. <Link to="/plans" style={{ color:'var(--accent)' }}>צור תוכנית קודם →</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {plans.map(plan => (
              <div key={plan.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, cursor:'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(232,255,71,.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border2)')}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginBottom:2 }}>{plan.name}</div>
                  {plan.description && <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.description}</div>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => startWorkout(plan)} style={{ flexShrink:0 }}>▶ התחל</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-wrap fade-up" style={{ maxWidth:700 }}>
      {/* Sticky header */}
      <div style={{ position:'sticky', top:'var(--mobile-header-h, 0)', zIndex:50, background:'var(--bg)', paddingBottom:12, marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'var(--card)', border:'1px solid var(--border2)', borderRadius:6 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'var(--accent)' }}>{selectedPlan?.name}</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{doneSets}/{totalSets} סטים</div>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, color:'var(--accent)', letterSpacing:2 }}>{fmtTime(elapsed)}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'var(--accent)', borderRadius:2, transition:'width .3s' }} />
        </div>
      </div>

      {/* Rest timer */}
      {restActive && restTimer !== null && (
        <div style={{ background:'rgba(232,255,71,.08)', border:'1px solid rgba(232,255,71,.25)', borderRadius:6, padding:'12px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--accent)', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>זמן מנוחה</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, color:'var(--accent)', lineHeight:1 }}>{fmtTime(restTimer)}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={skipRest}>דלג ←</button>
        </div>
      )}

      {/* Exercises */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
        {liveExs.map((lex, exIdx) => {
          const allDone = lex.sets.every(s => s.done)
          return (
            <div key={exIdx} className="card" style={{ borderColor: allDone ? 'rgba(71,255,178,.3)' : 'var(--border2)', padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{lex.exercise.exercise_name}</div>
                {allDone && <span className="tag tag-green">✓ הושלם</span>}
              </div>
              {/* Column headers */}
              <div className="sets-grid" style={{ marginBottom:6 }}>
                {['סט','ק"ג','חזרות',''].map(h => (
                  <div key={h} style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>{h}</div>
                ))}
              </div>
              {lex.sets.map((set, setIdx) => (
                <div key={setIdx} className="sets-grid" style={{ marginBottom:6, opacity: set.done ? .55 : 1, transition:'opacity .2s' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color: set.done ? 'var(--accent3)' : 'var(--muted)' }}>{setIdx+1}</div>
                  <div className="num-group">
                    <button onClick={() => updateSet(exIdx, setIdx, 'weight', Math.max(0, +(set.weight-2.5).toFixed(2)))}>−</button>
                    <input type="number" inputMode="decimal" value={set.weight || ''} onChange={e => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value)||0)} placeholder="0" />
                    <button onClick={() => updateSet(exIdx, setIdx, 'weight', +(set.weight+2.5).toFixed(2))}>+</button>
                  </div>
                  <div className="num-group">
                    <button onClick={() => updateSet(exIdx, setIdx, 'reps', Math.max(1, set.reps-1))}>−</button>
                    <input type="number" inputMode="numeric" value={set.reps || ''} onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value)||0)} />
                    <button onClick={() => updateSet(exIdx, setIdx, 'reps', set.reps+1)}>+</button>
                  </div>
                  <button onClick={() => toggleSet(exIdx, setIdx, lex.exercise.rest_seconds)}
                    style={{ padding:'9px 0', border:'none', borderRadius:4, fontWeight:700, fontSize:13, transition:'all .15s', touchAction:'manipulation',
                      background: set.done ? 'rgba(71,255,178,.15)' : 'var(--accent)',
                      color: set.done ? 'var(--accent3)' : 'var(--black)' }}>
                    {set.done ? '✓' : 'סיים'}
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, color:'var(--muted)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>הערות אימון</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="איך הרגשת? משהו מיוחד?" rows={3} />
      </div>

      <button className="btn btn-primary" onClick={finishWorkout} disabled={saving} style={{ width:'100%', padding:'14px 0', fontSize:16 }}>
        {saving ? <div className="spinner" style={{ width:18, height:18 }} /> : `🏁 סיים אימון (${fmtTime(elapsed)})`}
      </button>

      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
    </div>
  )
}
