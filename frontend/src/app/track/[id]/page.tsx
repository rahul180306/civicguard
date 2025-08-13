"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
const MapClient = dynamic(() => import('@/components/MapClient'), { ssr: false })

const API_BASE = '' // proxy via /api

type Ticket = {
  id: string
  iclass: string
  status: string
  address?: string
  lat?: number
  lng?: number
  media_url?: string
  authority?: string
  authority_ticket_id?: string
}

export default function TrackByIdPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Ticket | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!id) { setLoading(false); return }
      try {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const j = await res.json()
        if (!cancelled) setData(j)
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Track ticket</h2>
        <Link href="/complaints" className="text-sm text-[#d3e1fa] underline">Back to list</Link>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}
      {err && <div className="text-[#F44336] text-sm">{err}</div>}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4 space-y-2 hover-lift animate-in">
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Status</span><span className={`pill ${data.status==='FILED'?'pill-green':'pill-red'}`}>{data.status}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Class</span><span className="text-white/90">{data.iclass}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Authority</span><span className="text-white/90">{data.authority || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Authority ID</span><span className="text-white/90">{data.authority_ticket_id || '-'}</span></div>
            <div className="text-gray-400 text-sm">{data.address}</div>
          </div>
          <div className="card p-4 space-y-3 hover-lift animate-in">
            {data.media_url ? (
              <img src={data.media_url} alt="attachment" className="w-full rounded-lg" />
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
