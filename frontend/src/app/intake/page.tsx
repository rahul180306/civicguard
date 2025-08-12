'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
const MapClient = dynamic(() => import('@/components/MapClient'), { ssr: false })

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

export default function IntakePage() {
  const [image, setImage] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [contact, setContact] = useState('')
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [marker, setMarker] = useState<{lat:number; lng:number} | null>(null)
  const [addr, setAddr] = useState<string>('')
  const [zoom, setZoom] = useState<number>(12)
  const [locating, setLocating] = useState<boolean>(false)
  const [centerVersion, setCenterVersion] = useState<number>(0)
  const bestAccuracyRef = useRef<number | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const stopWatchTimeoutRef = useRef<any>(null)

  const onPickLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    try {
      setLocating(true)
      setError(null)
      bestAccuracyRef.current = null
      // stop any previous watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (stopWatchTimeoutRef.current) {
        clearTimeout(stopWatchTimeoutRef.current)
      }

      // Start watching for more accurate fixes for a short window
  const id = navigator.geolocation.watchPosition(
        (pos) => {
          const la = pos.coords.latitude
          const lo = pos.coords.longitude
          const acc = pos.coords.accuracy ?? Infinity
          const prevBest = bestAccuracyRef.current ?? Infinity
          // Always update UI on first fix; then only if accuracy improved by 5m or better than previous
          if (bestAccuracyRef.current === null || acc + 5 < prevBest) {
            bestAccuracyRef.current = acc
            console.log('Geolocation update', { lat: la, lng: lo, accuracy: acc })
            setLat(String(la))
            setLng(String(lo))
            setMarker({ lat: la, lng: lo })
            setZoom((z) => Math.max(z, 16))
            setCenterVersion((v) => v + 1)
          }
          // If good accuracy, stop early and reverse-geocode
          if (acc <= 30) {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current)
              watchIdRef.current = null
            }
            setLocating(false)
            geocode(la, lo)
          }
        },
        (err) => {
          console.warn('Geolocation error', err)
          setLocating(false)
          setError(err.message + ' — check browser site permissions and enable precise location if available.')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
      watchIdRef.current = id
      // Safety: stop the watch after 6s and geocode with the best-known position
      stopWatchTimeoutRef.current = setTimeout(() => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        setLocating(false)
        const la = Number(lat)
        const lo = Number(lng)
        if (!Number.isNaN(la) && !Number.isNaN(lo)) {
          geocode(la, lo)
        }
      }, 6000)
    } catch (e: any) {
      setLocating(false)
      setError(e?.message || 'Unable to start geolocation')
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      if (!image) {
        setError('Please choose an image')
        return
      }
      const fd = new FormData()
      fd.append('image', image)
      if (note) fd.append('note', note)
      if (contact) fd.append('contact', contact)
      if (lat) fd.append('lat', lat)
      if (lng) fd.append('lng', lng)

      const res = await fetch(`${API_BASE}/api/intake`, { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Upload failed (${res.status}): ${txt}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Reverse-geocode when lat/lng change (best-effort)
  const geocode = async (la: number, lo: number) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
      const res = await fetch(`${base}/test-geocode?lat=${la}&lng=${lo}`)
      if (res.ok) {
        const j = await res.json()
        if (j && j.address) setAddr(j.address)
      }
    } catch { /* ignore */ }
  }

  // Cleanup any ongoing geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (stopWatchTimeoutRef.current) {
        clearTimeout(stopWatchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Report an issue</h1>
      <form onSubmit={onSubmit} className="card p-4 space-y-4 animate-in">
        <div>
          <label className="block text-sm text-gray-400">Image</label>
          <div
            className={`mt-2 rounded-xl border border-white/10 bg-[#1f1f1f] p-4 text-sm text-gray-400 text-center transition-colors ${dragOver ? 'bg-white/5' : ''}`}
            onDragEnter={(e)=>{e.preventDefault(); setDragOver(true)}}
            onDragOver={(e)=>{e.preventDefault(); setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={(e)=>{e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if (f) setImage(f)}}
          >
            {image ? (
              <div className="flex items-center justify-between">
                <span className="truncate text-white/90">{image.name}</span>
                <button type="button" className="btn-muted" onClick={()=>setImage(null)}>Change</button>
              </div>
            ) : (
              <>
                Drag & drop a photo here or <label className="underline decoration-dotted cursor-pointer"><input hidden type="file" accept="image/*" onChange={(e)=>setImage(e.target.files?.[0]??null)} />browse</label>
              </>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className="mt-1 w-full rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-white/20"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400">Location preview</label>
          <div className="mt-2">
            <MapClient
              height={280}
              center={marker ? marker : (lat && lng ? { lat: Number(lat), lng: Number(lng)} : { lat: 13.0827, lng: 80.2707 })}
              zoom={zoom}
              centerVersion={centerVersion}
              draggableMarker={marker || (lat && lng ? { lat: Number(lat), lng: Number(lng)} : null)}
              onMarkerMove={(la, lo) => { setLat(String(la)); setLng(String(lo)); setMarker({lat:la, lng:lo}); geocode(la, lo) }}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onPickLocation} className="btn-muted">
                {locating ? 'Locating…' : 'Use my location'}
              </button>
              <button type="button" onClick={() => setCenterVersion(v => v + 1)} className="btn-muted">Center map</button>
            </div>
            {addr && <div className="mt-2 text-sm text-gray-300">{addr}</div>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400">Lat</label>
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="optional"
              className="mt-1 w-full rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400">Lng</label>
            <input
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="optional"
              className="mt-1 w-full rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-white/20"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400">Contact</label>
          <input
            type="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com (optional)"
            className="mt-1 w-full rounded-lg bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-white/20"
          />
        </div>
  <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="btn-white disabled:opacity-50">
            {submitting ? (<span className="flex items-center gap-2"><span className="spinner"/> Uploading…</span>) : 'Submit'}
          </button>
        </div>
      </form>

      {error && <p className="text-[#F44336]">{error}</p>}

      {result && (
        <section className="space-y-2 animate-in">
          <h2 className="text-xl font-semibold text-white">Result</h2>
          <pre className="rounded-lg bg-black/50 text-gray-200 p-3 text-sm overflow-auto border border-white/10">{JSON.stringify(result, null, 2)}</pre>
          {result.file_url && (
            <div className="card tint-blue p-2">
              <p className="text-sm text-gray-400">Preview:</p>
              <img src={result.file_url} alt="uploaded preview" className="mt-2 max-h-80 rounded-lg" />
            </div>
          )}
        </section>
      )}
    </main>
  )
}
