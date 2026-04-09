import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Plan, PlanExercise } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

const DEFAULT_EXERCISES = [
  'Barbell Bench Press','Goblet Squat','DB Shoulder Press','Cable Lateral Raise','Triceps Pushdown',
  'Pull-Up','Lat Pulldown','Bulgarian Split Squat','Cable Row','Face Pull','Hammer Curl',
  'Incline DB Press','Leg Press','Romanian Deadlift','Overhead Press','Barbell Row',
  'Dip','Chin-Up','Cable Fly','Leg Curl','Calf Raise',
]

export default function PlansPage() {
  const { user } = useAuth()
  const { toasts, showToast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [exercises, setExercises] = useState<{ [planId: string]: PlanExercise[] }>({})
  const [loading, setLoading] = useState(true)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [editExs, setEditExs] = useState<Partial<PlanExercise>[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // FIX 7: single batched fetch for all plan exercises
  useEffect(() => { fetchPlans() }, [user])

  const fetchPlans = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: plans, error } = await supabase
        .from('plans').select('*').eq('user_id', user.id).order('created_at')
      if (error || !plans) return

      setPlans(plans)

      // Fetch all exercises in one query
      const planIds = plans.map(p => p.id)
      if (planIds.length === 0) { setLoading(false); return }

      const { data: allExs } = await supabase
        .from('plan_exercises')
        .select('*')
        .in('plan_id', planIds)
        .order('sort_order')

      const exMap: { [id: string]: PlanExercise[] } = {}
      plans.forEach(p => { exMap[p.id] = [] })
      ;(allExs || []).forEach((ex: PlanExercise) => {
        if (exMap[ex.plan_id]) exMap[ex.plan_id].push(ex)
      })
      setExercises(exMap)
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    setEditPlan(null)
    setNewName(''); setNewDesc('')
    setEditExs([{ exercise_name: '', sets: 4, reps: '8-12', rest_seconds: 90, sort_order: 0 }])
    setShowForm(true)
  }

  const openEdit = (plan: Plan) => {
    setEditPlan(plan)
    setNewName(plan.name)
    setNewDesc(plan.description || '')
    setEditExs(exercises[plan.id]?.map(e => ({ ...e })) || [])
    setShowForm(true)
  }

  const addExRow = () =>
    setEditExs(ex => [...ex, { exercise_name: '', sets: 3, reps: '10-12', rest_seconds: 60, sort_order: ex.length }])

  const removeExRow = (i: number) => setEditExs(ex => ex.filter((_, idx) => idx !== i))

  const updateEx = (i: number, key: string, val: any) =>
    setEditExs(ex => ex.map((e, idx) => idx === i ? { ...e, [key]: val } : e))

  const savePlan = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      let planId = editPlan?.id
      if (editPlan) {
        const { error } = await supabase
          .from('plans').update({ name: newName, description: newDesc || null }).eq('id', editPlan.id)
        if (error) throw error
        await supabase.from('plan_exercises').delete().eq('plan_id', editPlan.id)
      } else {
        const { data, error } = await supabase
          .from('plans').insert({ user_id: user!.id, name: newName, description: newDesc || null })
          .select().single()
        if (error) throw error
        planId = data?.id
      }

      const rows = editExs
        .filter(e => e.exercise_name?.trim())
        .map((e, i) => ({ ...e, plan_id: planId, sort_order: i }))
      if (rows.length) {
        const { error } = await supabase.from('plan_exercises').insert(rows)
        if (error) throw error
      }

      showToast(editPlan ? 'תוכנית עודכנה ✓' : 'תוכנית נוצרה ✓')
      setShowForm(false)
      fetchPlans()
    } catch (e: any) {
      showToast(e?.message || 'שגיאה בשמירה', 'error')
    }
    setSaving(false)
  }

  const deletePlan = async (id: string) => {
    if (!confirm('למחוק את התוכנית?')) return
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) { showToast('שגיאה במחיקה', 'error'); return }
    showToast('תוכנית נמחקה')
    setPlans(p => p.filter(x => x.id !== id))
    setExercises(ex => { const n = { ...ex }; delete n[id]; return n })
  }

  return (
    <div className="page-wrap fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 1, lineHeight: 1 }}>
            תוכניות <span style={{ color: 'var(--accent)' }}>אימון</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>צור וערוך תוכניות אימון</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ תוכנית חדשה</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📋</div>
          אין תוכניות עדיין.<br />לחץ "+ תוכנית חדשה" להתחיל.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map(plan => (
            <div key={plan.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, marginBottom: 2 }}>{plan.name}</div>
                  {plan.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{plan.description}</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {exercises[plan.id]?.length || 0} תרגילים
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(plan) }}>✏️ עריכה</button>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deletePlan(plan.id) }}>🗑️</button>
                  <span style={{ color: 'var(--muted)', fontSize: 18 }}>{expandedId === plan.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === plan.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px 16px' }}>
                  {(exercises[plan.id] || []).length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>אין תרגילים</div>
                  ) : (exercises[plan.id] || []).map((ex, i) => (
                    <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < (exercises[plan.id]?.length || 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{i + 1}. {ex.exercise_name}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="tag tag-yellow">{ex.sets} סטים</span>
                        <span className="tag tag-green">{ex.reps} חזרות</span>
                        <span className="tag tag-blue">{ex.rest_seconds}שנ׳</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto', direction: 'rtl' }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card fade-up" style={{ width: '100%', maxWidth: 620, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26 }}>
                {editPlan ? 'עריכת תוכנית' : 'תוכנית חדשה'}
              </div>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>שם התוכנית *</div>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Full Body A" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>תיאור (אופציונלי)</div>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Push day — כתפיים וחזה" />
              </div>
            </div>

            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, marginBottom: 8 }}>תרגילים</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, display: 'grid', gridTemplateColumns: '2fr 60px 80px 70px 32px', gap: 6 }}>
              <span>שם</span><span>סטים</span><span>חזרות</span><span>מנוחה(שנ׳)</span><span />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {editExs.map((ex, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px 70px 32px', gap: 6, alignItems: 'center' }}>
                  <div>
                    <input list={`ex-list-${i}`} value={ex.exercise_name || ''}
                      onChange={e => updateEx(i, 'exercise_name', e.target.value)} placeholder="שם תרגיל" />
                    <datalist id={`ex-list-${i}`}>
                      {DEFAULT_EXERCISES.map(e => <option key={e} value={e} />)}
                    </datalist>
                  </div>
                  <input type="number" value={ex.sets || ''} min={1} max={10}
                    onChange={e => updateEx(i, 'sets', parseInt(e.target.value) || 3)}
                    style={{ padding: '10px 6px', textAlign: 'center' }} />
                  <input value={ex.reps || ''}
                    onChange={e => updateEx(i, 'reps', e.target.value)}
                    style={{ padding: '10px 6px', textAlign: 'center' }} />
                  <input type="number" value={ex.rest_seconds || ''} min={0}
                    onChange={e => updateEx(i, 'rest_seconds', parseInt(e.target.value) || 60)}
                    style={{ padding: '10px 6px', textAlign: 'center' }} />
                  <button onClick={() => removeExRow(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, padding: 0, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={addExRow} style={{ marginBottom: 22 }}>+ הוסף תרגיל</button>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>ביטול</button>
              <button className="btn btn-primary" onClick={savePlan} disabled={saving || !newName.trim()}>
                {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
    </div>
  )
}
