"use client"
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
const MapClient = dynamic(() => import('@/components/MapClient'), { ssr: false })

type Ticket = {
  id: string
  iclass: string
  status: string
  address?: string
  lat?: number
  lng?: number
  media_url?: string
  created_at?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
const STATUS_OPTS = ['', 'CREATED', 'FILING', 'FILED', 'RESOLVED', 'FAILED']
const ICLASS_OPTS = ['', 'pothole', 'garbage', 'streetlight', 'water_leak', 'illegal_parking', 'stray_animals']

export default function ComplaintsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [iclass, setIclass] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams()
        if (status) qs.set('status', status)
        if (iclass) qs.set('iclass', iclass)
        qs.set('limit', '100')
        const res = await fetch(`${API_BASE}/api/tickets?${qs.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = await res.json()
        const items: Ticket[] = Array.isArray(j) ? j : (j.items || [])
        if (!cancelled) setTickets(items)
      } catch (e: any) {
        if (!cancelled) {
          setError('Unable to load tickets')
          setTickets([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [status, iclass])

  const markers = useMemo(() => tickets.filter(t => t.lat && t.lng).map(t => ({ lat: t.lat as number, lng: t.lng as number, status: t.status, id: t.id })), [tickets])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Complaints</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-400">Status</label>
        <select className="border border-white/10 bg-[#1f1f1f] text-white rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value)}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
        </select>
        <label className="text-sm text-gray-400">Type</label>
        <select className="border border-white/10 bg-[#1f1f1f] text-white rounded px-2 py-1" value={iclass} onChange={e=>setIclass(e.target.value)}>
          {ICLASS_OPTS.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
        </select>
        {(status || iclass) && (
          <button className="btn-muted" onClick={()=>{ setStatus(''); setIclass('') }}>Clear</button>
        )}
        <div className="ml-auto text-sm text-gray-400">{loading ? 'Loading…' : `${tickets.length} items`}</div>
      </div>

      <MapClient height={420} markers={markers} />

      {error && <div className="text-[#F44336]">{error}</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((t) => (
          <div key={t.id} className="card overflow-hidden">
            {t.media_url ? (
              <img src={t.media_url} alt={t.iclass} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 bg-white/5 flex items-center justify-center text-gray-500">No image</div>
            )}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="pill pill-blue">{t.status}</span>
                <span className="text-xs text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
              </div>
              <div className="text-sm font-medium text-white/90">{t.iclass}</div>
              <div className="text-xs text-gray-400 line-clamp-2">{t.address || 'No address'}</div>
              <Link href={`/track/${t.id}`} className="text-xs text-[#d3e1fa] underline">View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
