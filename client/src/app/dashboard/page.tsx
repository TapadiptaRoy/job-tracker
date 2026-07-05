'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { Application, Stats, Status } from '@/types'

const STATUS_COLORS: Record<Status, string> = {
  APPLIED: '#3b82f6',
  INTERVIEW: '#f59e0b',
  OFFER: '#10b981',
  REJECTED: '#ef4444',
  GHOSTED: '#6b7280',
}

const STATUS_BG: Record<Status, string> = {
  APPLIED: '#eff6ff',
  INTERVIEW: '#fffbeb',
  OFFER: '#ecfdf5',
  REJECTED: '#fef2f2',
  GHOSTED: '#f9fafb',
}

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
  const [form, setForm] = useState({ company: '', role: '', status: 'APPLIED', notes: '', jobUrl: '', salary: '', location: '' })
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

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const resetForm = () => {
    setForm({ company: '', role: '', status: 'APPLIED', notes: '', jobUrl: '', salary: '', location: '' })
    setEditingId(null)
    setError('')
  }

  const openEdit = (app: Application) => {
    setForm({ company: app.company, role: app.role, status: app.status, notes: app.notes || '', jobUrl: app.jobUrl || '', salary: app.salary || '', location: app.location || '' })
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

  const filtered = applications.filter(app => {
    const matchSearch = !search || app.company.toLowerCase().includes(search.toLowerCase()) || app.role.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || app.status === filterStatus
    return matchSearch && matchStatus
  })

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
          <button onClick={handleLogout} style={{ fontSize: '14px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total', value: stats.total, color: '#0f172a' },
              { label: 'Applied', value: stats.applied, color: '#3b82f6' },
              { label: 'Interview', value: stats.interview, color: '#f59e0b' },
              { label: 'Offer', value: stats.offer, color: '#10b981' },
              { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
              { label: 'Response Rate', value: `${stats.responseRate}%`, color: '#8b5cf6' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px 0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', width: '220px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: 'white' }}
            >
              <option value="">All Status</option>
              {(['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED'] as Status[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 24px 0' }}>{editingId ? 'Edit Application' : 'Add Application'}</h2>
              <form onSubmit={handleSubmit}>
                {[
                  { label: 'Company', key: 'company', required: true, placeholder: 'Google' },
                  { label: 'Role', key: 'role', required: true, placeholder: 'Backend Engineer' },
                  { label: 'Location', key: 'location', placeholder: 'Remote' },
                  { label: 'Salary', key: 'salary', placeholder: '120000' },
                  { label: 'Job URL', key: 'jobUrl', placeholder: 'https://...' },
                ].map(({ label, key, required, placeholder }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>{label}</label>
                    <input
                      type="text"
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required={required}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: 'white' }}
                  >
                    {(['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED'] as Status[]).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any notes about this application..."
                    rows={3}
                    style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '14px', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm() }}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: formLoading ? '#93c5fd' : '#2563eb', color: 'white', fontSize: '14px', fontWeight: '600', cursor: formLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {formLoading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Applications list */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '15px' }}>No applications yet. Add your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((app) => (
              <div key={app.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{app.company}</h3>
                    <span style={{ background: STATUS_BG[app.status], color: STATUS_COLORS[app.status], fontSize: '12px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px' }}>
                      {app.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 8px 0' }}>{app.role}</p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {app.location && <span style={{ fontSize: '13px', color: '#94a3b8' }}>📍 {app.location}</span>}
                    {app.salary && <span style={{ fontSize: '13px', color: '#94a3b8' }}>💰 {app.salary}</span>}
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>📅 {new Date(app.appliedDate).toLocaleDateString()}</span>
                  </div>
                  {app.notes && <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0 0', fontStyle: 'italic' }}>{app.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(app)}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#374151' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
