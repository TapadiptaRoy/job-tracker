'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { Application, Status } from '@/types'

interface Stats {
  total: number
  applied: number
  interview: number
  offer: number
  rejected: number
  ghosted: number
  responseRate: number
  appliedThisWeek: number
  needFollowUp: number
  avgDays: number
}

const STATUS_COLORS: Record<Status, string> = {
  APPLIED: '#3b82f6',
  INTERVIEW: '#f59e0b',
  OFFER: '#10b981',
  REJECTED: '#ef4444',
  GHOSTED: '#6b7280',
  SELECTED: '#8b5cf6',
}

const STATUS_BG: Record<Status, string> = {
  APPLIED: '#eff6ff',
  INTERVIEW: '#fffbeb',
  OFFER: '#ecfdf5',
  REJECTED: '#fef2f2',
  GHOSTED: '#f9fafb',
  SELECTED: '#f5f3ff',
}

const STATUSES: Status[] = ['APPLIED', 'INTERVIEW', 'SELECTED', 'OFFER', 'REJECTED', 'GHOSTED']


export default function DashboardPage() {
  const router = useRouter()
  const { user, clearAuth, initAuth } = useAuthStore()
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFollowUp, setFilterFollowUp] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [form, setForm] = useState({
    company: '', role: '', status: 'APPLIED', notes: '',
    jobUrl: '', salary: '', location: '', followUpDate: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    initAuth()
    const token = localStorage.getItem('accessToken')
    if (!token) { router.push('/login'); return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [appsRes, statsRes] = await Promise.all([
        api.get('/applications'),
        api.get('/applications/stats'),
      ])
      setApplications(appsRes.data)
      setStats(statsRes.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { clearAuth(); router.push('/login') }

  const resetForm = () => {
    setForm({ company: '', role: '', status: 'APPLIED', notes: '', jobUrl: '', salary: '', location: '', followUpDate: '' })
    setEditingId(null)
    setError('')
  }

  const openEdit = (app: Application) => {
    setForm({
      company: app.company, role: app.role, status: app.status,
      notes: app.notes || '', jobUrl: app.jobUrl || '', salary: app.salary || '',
      location: app.location || '',
      followUpDate: app.followUpDate ? new Date(app.followUpDate).toISOString().split('T')[0] : ''
    })
    setEditingId(app.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')
    try {
      if (editingId) {
        await api.patch(`/applications/${editingId}`, form)
      } else {
        await api.post('/applications', form)
      }
      setShowForm(false)
      resetForm()
      fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return
    try {
      await api.delete(`/applications/${id}`)
      fetchAll()
    } catch {}
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/applications/${id}`, { status })
      fetchAll()
    } catch {}
  }

  const exportCSV = () => {
    const headers = ['Company', 'Role', 'Status', 'Location', 'Salary', 'Applied Date', 'Follow Up Date', 'Notes']
    const rows = applications.map(a => [
      a.company, a.role, a.status, a.location || '', a.salary || '',
      new Date(a.appliedDate).toLocaleDateString(),
      a.followUpDate ? new Date(a.followUpDate).toLocaleDateString() : '',
      a.notes || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'job-applications.csv'
    a.click()
  }

  const now = new Date()

  const filtered = applications.filter(app => {
    const matchSearch = !search || app.company.toLowerCase().includes(search.toLowerCase()) || app.role.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || app.status === filterStatus
    const matchFollowUp = !filterFollowUp || (app.followUpDate && new Date(app.followUpDate) <= now && (app.status === 'APPLIED' || app.status === 'INTERVIEW'))
    return matchSearch && matchStatus && matchFollowUp
  })

  const isOverdue = (app: Application) =>
    app.followUpDate && new Date(app.followUpDate) <= now && (app.status === 'APPLIED' || app.status === 'INTERVIEW')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#64748b' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Job Tracker</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Hi, {user?.name}</span>
          <button onClick={exportCSV} style={{ fontSize: '13px', color: '#2563eb', background: 'none', border: '1px solid #2563eb', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontWeight: '500' }}>Export CSV</button>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Follow-up Alert Banner */}
        {stats && stats.needFollowUp > 0 && (
          <div
            onClick={() => { setFilterFollowUp(true); setFilterStatus('') }}
            style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '20px' }}>🔥</span>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: '#9a3412', fontSize: '14px' }}>{stats.needFollowUp} application{stats.needFollowUp > 1 ? 's' : ''} need follow-up today</p>
              <p style={{ margin: 0, color: '#c2410c', fontSize: '13px' }}>Click to filter and see them</p>
            </div>
            {filterFollowUp && (
              <button onClick={(e) => { e.stopPropagation(); setFilterFollowUp(false) }} style={{ marginLeft: 'auto', fontSize: '12px', color: '#9a3412', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Clear x</button>
            )}
          </div>
        )}

        {/* Smart Dashboard */}
        {stats && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px 0' }}>Smart Insights</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              {[
                { emoji: '🎯', label: 'Applied This Week', value: stats.appliedThisWeek, color: '#2563eb' },
                { emoji: '📈', label: 'Response Rate', value: `${stats.responseRate}%`, color: '#7c3aed' },
                { emoji: '💼', label: 'In Interview', value: stats.interview, color: '#d97706' },
                { emoji: '❌', label: 'Rejections', value: stats.rejected, color: '#dc2626' },
                { emoji: '⏳', label: 'Avg Days Since Apply', value: `${stats.avgDays}d`, color: '#0891b2' },
                { emoji: '🔥', label: 'Follow-up Today', value: stats.needFollowUp, color: '#ea580c' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{s.emoji}</span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 14px 0' }}>Pipeline</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '14px' }}>
              {[
                { label: 'Total', value: stats.total, color: '#0f172a' },
                { label: 'Applied', value: stats.applied, color: '#3b82f6' },
                { label: 'Interview', value: stats.interview, color: '#f59e0b' },
                { label: 'Offer', value: stats.offer, color: '#10b981' },
                { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
                { label: 'Ghosted', value: stats.ghosted, color: '#6b7280' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  <p style={{ fontSize: '26px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', width: '210px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: 'white' }}
            >
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #d1d5db', overflow: 'hidden' }}>
              {(['list', 'kanban'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: view === v ? '#2563eb' : 'white', color: view === v ? 'white' : '#374151' }}>
                  {v === 'list' ? 'List' : 'Kanban'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            style={{ background: '#2563eb', color: 'white', padding: '9px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer' }}
          >
            + Add Application
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 24px 0' }}>{editingId ? 'Edit Application' : 'Add Application'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Company *', key: 'company', required: true, placeholder: 'Google' },
                    { label: 'Role *', key: 'role', required: true, placeholder: 'Backend Engineer' },
                    { label: 'Location', key: 'location', placeholder: 'Remote' },
                    { label: 'Salary', key: 'salary', placeholder: '120000' },
                    { label: 'Job URL', key: 'jobUrl', placeholder: 'https://...' },
                  ].map(({ label, key, required, placeholder }) => (
                    <div key={key} style={{ gridColumn: key === 'jobUrl' ? 'span 2' : 'span 1' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>{label}</label>
                      <input
                        type="text"
                        value={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        required={required}
                        placeholder={placeholder}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: 'white' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Follow-up Date</label>
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any notes about this application..."
                      rows={3}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '14px', padding: '12px', borderRadius: '8px', margin: '16px 0' }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={formLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: formLoading ? '#93c5fd' : '#2563eb', color: 'white', fontSize: '14px', fontWeight: '600', cursor: formLoading ? 'not-allowed' : 'pointer' }}>
                    {formLoading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          filtered.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '15px' }}>No applications found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((app) => (
                <div key={app.id} style={{ background: 'white', borderRadius: '12px', border: `1px solid ${isOverdue(app) ? '#fed7aa' : '#e2e8f0'}`, padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{app.company}</h3>
                      {isOverdue(app) && <span style={{ fontSize: '11px', background: '#fff7ed', color: '#ea580c', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>Follow-up overdue</span>}
                    </div>
                    <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 10px 0' }}>{app.role}</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        style={{ padding: '3px 10px', borderRadius: '20px', border: 'none', background: STATUS_BG[app.status], color: STATUS_COLORS[app.status], fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {app.location && <span style={{ fontSize: '13px', color: '#94a3b8' }}>📍 {app.location}</span>}
                      {app.salary && <span style={{ fontSize: '13px', color: '#94a3b8' }}>💰 {app.salary}</span>}
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>📅 {new Date(app.appliedDate).toLocaleDateString()}</span>
                      {app.followUpDate && <span style={{ fontSize: '13px', color: isOverdue(app) ? '#ea580c' : '#94a3b8' }}>🔔 Follow-up: {new Date(app.followUpDate).toLocaleDateString()}</span>}
                    </div>
                    {app.notes && <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0 0', fontStyle: 'italic' }}>{app.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(app)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#374151' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(app.id)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#ef4444' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {STATUSES.map(status => {
              const col = applications.filter(a => a.status === status)
              return (
                <div key={status} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: STATUS_COLORS[status] }}>{status}</span>
                    <span style={{ fontSize: '12px', background: STATUS_BG[status], color: STATUS_COLORS[status], padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>{col.length}</span>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '80px' }}>
                    {col.length === 0 && <p style={{ fontSize: '13px', color: '#cbd5e1', textAlign: 'center', margin: '12px 0' }}>Empty</p>}
                    {col.map(app => (
                      <div key={app.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: `1px solid ${isOverdue(app) ? '#fed7aa' : '#e2e8f0'}` }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 2px 0' }}>{app.company}</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>{app.role}</p>
                        {isOverdue(app) && <p style={{ fontSize: '11px', color: '#ea580c', margin: '0 0 6px 0', fontWeight: '600' }}>Follow-up overdue</p>}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(app)}
                            style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#374151', fontWeight: '500' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(app.id)}
                            style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', fontWeight: '500' }}>
                            Del
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
