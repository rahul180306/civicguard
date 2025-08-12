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

import dynamic from 'next/dynamic'
const StatsClient = dynamic(() => import('@/components/StatsClient'), { ssr: false })

export default function HomePage() {
  return (
    <div className="space-y-6">
      <StatsClient />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4 space-y-4 hover-lift animate-in">
          <div className="text-gray-400 text-sm">Quick actions</div>
          <a className="btn-white w-full text-center" href="/intake">Report an issue</a>
          <a className="btn-muted w-full text-center" href="/track">Track a ticket</a>
          <div className="text-[10px] text-gray-500">Tip: drag & drop a photo on the Report page.</div>
        </div>
        <div className="card p-4 space-y-4 md:col-span-2 hover-lift animate-in">
          <div className="flex items-center justify-between">
            <div className="text-gray-400 text-sm">Weekly throughput</div>
            <div className="pill">This week</div>
          </div>
          <div className="bars">
            <div className="bar" style={{['--h' as any]:'30%'}}></div>
            <div className="bar alt" style={{['--h' as any]:'55%'}}></div>
            <div className="bar" style={{['--h' as any]:'45%'}}></div>
            <div className="bar alt" style={{['--h' as any]:'70%'}}></div>
            <div className="bar" style={{['--h' as any]:'60%'}}></div>
            <div className="bar alt" style={{['--h' as any]:'80%'}}></div>
            <div className="bar" style={{['--h' as any]:'50%'}}></div>
          </div>

          <div className="text-gray-400 text-sm">Recent activity</div>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              ['Pothole','Filed'],
              ['Garbage','Created'],
              ['Streetlight','Filed'],
              ['Water leak','Created'],
            ].map((row, i) => (
              <div key={i} className="card-muted p-3 rounded-xl text-sm flex items-center justify-between hover-lift animate-in" style={{animationDelay:`${i*40}ms`}}>
                <span className="text-white/90">{row[0]}</span>
                <span className={`pill ${row[1]==='Filed'?'pill-green':'pill-red'}`}>{row[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
