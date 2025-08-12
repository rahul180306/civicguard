'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
const MapClient = dynamic(() => import('@/components/MapClient'), { ssr: false })

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

export default function TrackPage() {
  const [tid, setTid] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string| null>(null)

  const fetchTicket = async () => {
    setLoading(true); setErr(null); setData(null)
    try {
      if (!tid) throw new Error('Enter a ticket ID')
      const res = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(tid)}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const j = await res.json(); setData(j)
    } catch (e: any) { setErr(e.message || 'Failed') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Track ticket</h2>
      <div className="card p-4 animate-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={tid} onChange={(e)=>setTid(e.target.value)} placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" className="w-full rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-white/20" />
          <button onClick={fetchTicket} disabled={loading} className="btn-white w-full sm:w-auto">{loading? (<span className="flex items-center gap-2"><span className="spinner"/> Loading…</span>):'Fetch'}</button>
        </div>
      </div>
      {err && <div className="text-[#F44336] text-sm">{err}</div>}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4 space-y-2 hover-lift animate-in">
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Status</span><span className={`pill ${data.status==='FILED'?'pill-green':'pill-red'}`}>{data.status}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Class</span><span className="text-white/90">{data.iclass}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Severity</span><span className="text-white/90">{data.severity}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Authority</span><span className="text-white/90">{data.authority || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Authority ID</span><span className="text-white/90">{data.authority_ticket_id || '-'}</span></div>
            <div className="text-gray-400 text-sm">{data.address}</div>
          </div>
          <div className="card p-4 space-y-3 hover-lift animate-in">
            {data.file_url ? (
              <img src={data.file_url} alt="attachment" className="w-full rounded-lg" />
            ) : (
              <div className="text-gray-500 text-sm">No image</div>
            )}
            {data.lat && data.lng && (
              <MapClient
                height={260}
                center={{ lat: data.lat, lng: data.lng }}
                zoom={15}
                markers={[{ lat: data.lat, lng: data.lng, status: data.status, id: data.id }]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
