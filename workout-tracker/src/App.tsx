import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import PlansPage from './pages/PlansPage'
import './index.css'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:'var(--accent)', marginBottom:16 }}>LIFTTRACK</div>
        <div style={{ display:'flex', justifyContent:'center' }}><div className="spinner" style={{ width:28, height:28 }} /></div>
      </div>
    </div>
  )
  if (!user) return <AuthPage />
  return (
    <Layout>
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/plans"   element={<PlansPage />} />
        <Route path="*"        element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
