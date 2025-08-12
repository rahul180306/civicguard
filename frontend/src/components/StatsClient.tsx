"use client"
import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

function Stat({ label, value, tone = 'default', delay = 0, solid = false }: { label: string; value: string; tone?: 'default'|'blue'|'amber'|'mint'|'green'; delay?: number; solid?: boolean }) {
  const toneClass = tone === 'blue' ? 'from-[#d3e1fa]/30'
    : tone === 'amber' ? 'from-[#ffd78e]/30'
    : tone === 'mint' ? 'from-[#d2f9e7]/30'
    : tone === 'green' ? 'from-[#b4ea98]/30'
    : 'from-white/10'
  const shellClass = solid
    ? (tone==='blue' ? 'card card-solid-blue' : tone==='amber' ? 'card card-solid-amber' : tone==='mint' ? 'card card-solid-mint' : 'card')
    : `card ${tone==='blue'?'tint-blue':tone==='amber'?'tint-amber':tone==='mint'?'tint-mint':tone==='green'?'tint-green':''}`
  const labelClass = solid ? 'text-xs text-black/70' : 'text-xs text-gray-400'
  const valueClass = solid ? 'mt-2 text-3xl font-semibold text-black tracking-tight' : 'mt-2 text-3xl font-semibold text-white tracking-tight'
  const meterBg = solid ? 'bg-black/10' : 'bg-white/5'
  return (
    <div className={`${shellClass} p-4 hover-lift animate-in`} style={{animationDelay: `${delay}ms`}}>
      <div className={labelClass}>{label}</div>
      <div className={valueClass}>{value}</div>
      <div className={`mt-3 h-2 w-full rounded-full ${meterBg} overflow-hidden`}>
        <div className={`h-full w-1/2 bg-gradient-to-r ${toneClass} to-transparent shimmer`}></div>
      </div>
    </div>
  )
}

export default function StatsClient() {
  const [open, setOpen] = useState<number>(0)
  const [filedToday, setFiledToday] = useState<number>(0)
  const [avg, setAvg] = useState<string>('0m 00s')

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stats`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        if (!cancelled) {
          setOpen(j.open ?? 0)
          setFiledToday(j.filed_today ?? 0)
          setAvg(j.avg_time_to_file ?? '0m 00s')
        }
      } catch { /* ignore */ }
    }
    fetchStats()
    const id = setInterval(fetchStats, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Stat label="Open tickets" value={String(open)} tone="blue" solid delay={0} />
      <Stat label="Filed today" value={String(filedToday)} tone="amber" solid delay={60} />
      <Stat label="Avg. time to file" value={avg} tone="mint" solid delay={120} />
    </div>
  )
}
