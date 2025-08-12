import dynamic from 'next/dynamic'
const MapClient = dynamic(() => import('@/components/MapClient'), { ssr: false })

async function getTickets() {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
  try {
    const res = await fetch(`${base}/api/tickets`, { cache: 'no-store' })
    if (!res.ok) return []
  const j = await res.json()
  return Array.isArray(j) ? j : (j.items || [])
  } catch { return [] }
}

export default async function MapPage() {
  const tickets: any[] = await getTickets()
  const markers = tickets.filter(t => t.lat && t.lng).map(t => ({ lat: t.lat, lng: t.lng, status: t.status, id: t.id }))
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Nearby reports</h2>
      <MapClient height={540} markers={markers} />
    </div>
  )
}
