"use client"
import { useEffect, useRef } from 'react'

type Marker = { lat: number; lng: number; status?: string; id?: string }

export default function MapClient({
  height = 360,
  center = { lat: 13.0827, lng: 80.2707 },
  zoom = 12,
  markers = [],
  draggableMarker,
  onMarkerMove,
  centerVersion = 0,
}: {
  height?: number
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Marker[]
  draggableMarker?: { lat: number; lng: number } | null
  onMarkerMove?: (lat: number, lng: number) => void
  centerVersion?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const dragRef = useRef<any>(null)

  // Initialize Leaflet and map once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mod = await import('leaflet')
      if (cancelled) return
      const L: any = (mod as any).default ?? mod
      leafletRef.current = L
      // default icon fix (vite/next asset paths)
      // @ts-ignore
      delete (L.Icon.Default as any).prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom)
      mapRef.current = map

      const token = (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_MAPBOX_TOKEN : undefined) || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (token) {
        L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${token}`,
          { maxZoom: 19, tileSize: 512, zoomOffset: -1 }
        ).addTo(map)
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      }

      markersLayerRef.current = L.layerGroup().addTo(map)
    })()

    return () => {
      cancelled = true
      try {
        if (dragRef.current) {
          dragRef.current.remove()
          dragRef.current = null
        }
        if (markersLayerRef.current) {
          markersLayerRef.current.clearLayers()
          markersLayerRef.current.remove()
          markersLayerRef.current = null
        }
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update view, markers, and draggable marker when props change
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const group = markersLayerRef.current
    if (!L || !map || !group) return

    // keep view in sync
    map.setView([center.lat, center.lng], zoom)

    // clear and redraw markers
    group.clearLayers()
    markers.forEach((m) => {
      const color = m.status === 'FILED' ? '#b4ea98' : m.status === 'CREATED' ? '#F44336' : '#d3e1fa'
      const marker = L.marker([m.lat, m.lng], { title: m.id || '' })
      const ring = L.circleMarker([m.lat, m.lng], { radius: 8, color, weight: 2, fillOpacity: 0.15 })
      marker.bindPopup(`<div style=\"min-width:140px\">${m.id || ''}<br/><span style=\"color:${color}\">${m.status || ''}</span></div>`)
      group.addLayer(marker)
      group.addLayer(ring)
    })

    // handle draggable marker
    if (draggableMarker) {
      if (!dragRef.current) {
        dragRef.current = L.marker([draggableMarker.lat, draggableMarker.lng], { draggable: true }).addTo(map)
        dragRef.current.on('dragend', () => {
          const ll = dragRef.current.getLatLng()
          onMarkerMove?.(ll.lat, ll.lng)
        })
      } else {
        dragRef.current.setLatLng([draggableMarker.lat, draggableMarker.lng])
      }
    } else if (dragRef.current) {
      dragRef.current.remove()
      dragRef.current = null
    }
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), draggableMarker?.lat, draggableMarker?.lng, onMarkerMove, centerVersion])

  return <div ref={containerRef} style={{ height, borderRadius: 12, overflow: 'hidden' }} className="border border-white/10" />
}
